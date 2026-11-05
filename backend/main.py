import hashlib
import os
import re
import secrets
from datetime import datetime, timedelta

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import auth
import email_service
import manager_config
import models
import schemas
from database import Base, engine, get_db, run_migrations

Base.metadata.create_all(bind=engine)
run_migrations()

app = FastAPI(title="BankApp API")

# Local dev origins always work; add production frontend URLs (e.g. your Vercel
# domain) via the ALLOWED_ORIGINS env var — comma-separated, no spaces.
# See docs/deployment.md.
_default_origins = ["http://localhost:4200", "http://127.0.0.1:4200"]
_extra_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins + _extra_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


OTP_TTL_MINUTES = 10
MAX_OTP_ATTEMPTS = 5


def _derive_unique_username(db: Session, email: str) -> str:
    """Derive a display username from the email's local part, de-duplicated."""
    base = re.sub(r"[^a-zA-Z0-9_]", "", email.split("@")[0]) or "user"
    base = base[:40]
    candidate = base
    suffix = 1
    while db.query(models.User).filter(models.User.username == candidate).first() is not None:
        suffix += 1
        candidate = f"{base}{suffix}"
    return candidate


def _hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode("utf-8")).hexdigest()


def _generate_and_send_otp(user: models.User, db: Session) -> None:
    if not manager_config.BREVO_API_KEY or not manager_config.FROM_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email sign-in isn't configured yet — set the BREVO_API_KEY env var and FROM_EMAIL in backend/manager_config.py.",
        )
    code = f"{secrets.randbelow(1_000_000):06d}"
    user.otp_hash = _hash_otp(code)
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=OTP_TTL_MINUTES)
    user.otp_attempts = 0
    db.commit()
    try:
        email_service.send_otp_email(
            manager_config.BREVO_API_KEY, manager_config.FROM_EMAIL, manager_config.FROM_NAME, user.email, code
        )
    except email_service.EmailSendError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not send the verification email. Please try again shortly.",
        )


def _resync_role(user: models.User) -> None:
    user.role = "manager" if user.email in manager_config.MANAGER_EMAILS else "customer"


@app.post("/auth/signup", status_code=status.HTTP_201_CREATED)
def signup(payload: schemas.SignupRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing is not None:
        if existing.email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists — please sign in instead.",
            )
        # An earlier signup attempt never got verified (e.g. the OTP email failed
        # to send, or they just never finished). Stage the new details in the
        # pending_* columns rather than overwriting full_name/age/mobile directly
        # — those only get committed once the OTP is actually verified, so nobody
        # can clobber an existing account's real profile just by knowing its email.
        user = existing
    else:
        user = models.User(
            username=_derive_unique_username(db, email),
            email=email,
            email_verified=False,
            role="customer",
        )
        db.add(user)
    user.pending_full_name = payload.full_name
    user.pending_age = payload.age
    user.pending_mobile = payload.mobile
    db.commit()
    db.refresh(user)
    _generate_and_send_otp(user, db)
    return {"status": "otp_sent"}


@app.post("/auth/request-otp")
def request_otp(payload: schemas.RequestOtpRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No account found for this email — please sign up.")
    _generate_and_send_otp(user, db)
    return {"status": "otp_sent"}


@app.post("/auth/verify-otp", response_model=schemas.Token)
def verify_otp(payload: schemas.VerifyOtpRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None or user.otp_hash is None or user.otp_expires_at is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No pending verification for this email — request a new code.")
    if datetime.utcnow() > user.otp_expires_at:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="This code has expired — request a new one.")
    if user.otp_attempts >= MAX_OTP_ATTEMPTS:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many incorrect attempts — request a new code.")

    if _hash_otp(payload.otp) != user.otp_hash:
        user.otp_attempts += 1
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect code. Please try again.")

    user.email_verified = True
    user.otp_hash = None
    user.otp_expires_at = None
    user.otp_attempts = 0
    # Only now — proof that this caller actually controls the inbox — does any
    # staged signup data become the real profile.
    if user.pending_full_name is not None:
        user.full_name = user.pending_full_name
        user.age = user.pending_age
        user.mobile = user.pending_mobile
        user.pending_full_name = None
        user.pending_age = None
        user.pending_mobile = None
    _resync_role(user)
    db.commit()
    db.refresh(user)

    token = auth.create_access_token(user)
    return schemas.Token(access_token=token, role=user.role, username=user.username)


@app.get("/auth/me", response_model=schemas.UserOut)
def get_current_user_profile(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@app.post("/loan-applications", response_model=schemas.LoanApplicationOut, status_code=201)
def create_loan_application(
    payload: schemas.LoanApplicationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    record = models.LoanApplication(user_id=current_user.id, **payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/loan-applications", response_model=list[schemas.LoanApplicationOut])
def list_loan_applications(
    db: Session = Depends(get_db),
    _manager: models.User = Depends(auth.require_manager),
):
    return db.query(models.LoanApplication).order_by(models.LoanApplication.created_at.desc()).all()


@app.post("/deposit-applications", response_model=schemas.DepositApplicationOut, status_code=201)
def create_deposit_application(
    payload: schemas.DepositApplicationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    record = models.DepositApplication(user_id=current_user.id, **payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/deposit-applications", response_model=list[schemas.DepositApplicationOut])
def list_deposit_applications(
    db: Session = Depends(get_db),
    _manager: models.User = Depends(auth.require_manager),
):
    return db.query(models.DepositApplication).order_by(models.DepositApplication.created_at.desc()).all()


@app.get("/manager/customers", response_model=list[schemas.CustomerSummary])
def list_customers(
    db: Session = Depends(get_db),
    _manager: models.User = Depends(auth.require_manager),
):
    """Every registered customer, not just ones with applications — each includes
    their loan/deposit applications (empty lists if they haven't applied for anything)."""
    customers = (
        db.query(models.User)
        .filter(models.User.role == "customer")
        .order_by(models.User.username)
        .all()
    )
    return customers
