import hashlib
import os
import re
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta

from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import false
from sqlalchemy.orm import Session

import auth
import branches
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


def _is_staff_email(email: str) -> bool:
    return email in manager_config.SUPER_MANAGER_EMAILS or email in branches.BRANCH_BY_EMAIL


def _resync_role(user: models.User) -> None:
    """Re-derive role (and a manager's branch) from the email on every sign-in.
    Super manager is checked first: the Head Office email (201) is both a
    super manager and a branch email, and must be a super manager."""
    email = (user.email or "").lower()
    branch = branches.BRANCH_BY_EMAIL.get(email)
    if email in manager_config.SUPER_MANAGER_EMAILS:
        user.role = "super_manager"
        user.branch_code = None
    elif branch is not None:
        user.role = "manager"
        user.branch_code = branch.code
    else:
        # Customers keep the branch they chose at signup.
        user.role = "customer"


@app.post("/auth/signup", status_code=status.HTTP_201_CREATED)
def signup(payload: schemas.SignupRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if payload.branch_code not in branches.BRANCHES_BY_CODE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please choose a valid branch.")
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
    user.pending_branch_code = payload.branch_code
    db.commit()
    db.refresh(user)
    _generate_and_send_otp(user, db)
    return {"status": "otp_sent"}


@app.post("/auth/request-otp")
def request_otp(payload: schemas.RequestOtpRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        if not _is_staff_email(email):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No account found for this email — please sign up.")
        # Managers/super managers never fill in the customer signup form (age,
        # branch...): their account is created here and their role/branch is
        # set from the email once the OTP is verified.
        user = models.User(
            username=_derive_unique_username(db, email),
            email=email,
            email_verified=False,
            role="customer",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
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
        user.branch_code = user.pending_branch_code
        user.pending_full_name = None
        user.pending_age = None
        user.pending_mobile = None
        user.pending_branch_code = None
    _resync_role(user)
    db.commit()
    db.refresh(user)

    token = auth.create_access_token(user)
    return schemas.Token(
        access_token=token,
        role=user.role,
        username=user.username,
        branch_code=user.branch_code,
        branch_name=user.branch_name,
    )


@app.get("/branches", response_model=list[schemas.BranchOut])
def list_branches():
    """Public: feeds the signup dropdown. Manager emails are not included."""
    return branches.BRANCHES


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
    _super_manager: models.User = Depends(auth.require_super_manager),
):
    # Unscoped list of every branch's applications, so super managers only.
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
    _super_manager: models.User = Depends(auth.require_super_manager),
):
    # Unscoped list of every branch's applications, so super managers only.
    return db.query(models.DepositApplication).order_by(models.DepositApplication.created_at.desc()).all()


@app.get("/manager/customers", response_model=list[schemas.CustomerSummary])
def list_customers(
    db: Session = Depends(get_db),
    manager: models.User = Depends(auth.require_manager),
):
    """Registered customers, not just ones with applications — each includes
    their loan/deposit applications (empty lists if they haven't applied for anything).

    A branch manager only ever gets their own branch's customers; this filter is
    the real access control. A super manager gets every branch (plus customers
    with no branch), and the dashboard filters by branch in the browser."""
    query = db.query(models.User).filter(models.User.role == "customer")
    if manager.role != "super_manager":
        if manager.branch_code is None:
            return []
        query = query.filter(models.User.branch_code == manager.branch_code)
    return query.order_by(models.User.username).all()


# ---------------------------------------------------------------------------
# Kiosk call-back requests (no sign-in) — see docs/kiosk.md
# ---------------------------------------------------------------------------

CALLBACKS_PER_MOBILE_PER_DAY = 3
# Generous on purpose: every request from a kiosk shares that machine's IP.
CALLBACKS_PER_IP_PER_HOUR = 60
_callback_hits_by_ip: dict[str, deque] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    # Render sits behind a proxy; the original client is the first X-Forwarded-For entry.
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _ip_over_limit(ip: str) -> bool:
    """In-memory sliding window. Resets when the server restarts, which is fine
    for a demo-scale abuse guard (a real deployment would use Redis or similar)."""
    now = time.monotonic()
    hits = _callback_hits_by_ip[ip]
    while hits and now - hits[0] > 3600:
        hits.popleft()
    if len(hits) >= CALLBACKS_PER_IP_PER_HOUR:
        return True
    hits.append(now)
    return False


@app.post("/callback-requests", status_code=status.HTTP_201_CREATED)
def create_callback_request(payload: schemas.CallbackRequestCreate, request: Request, db: Session = Depends(get_db)):
    # Honeypot filled in: pretend it worked so bots learn nothing, store nothing.
    if payload.website:
        return {"status": "received"}
    if not payload.consent:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please agree to be contacted.")
    if payload.branch_code not in branches.BRANCHES_BY_CODE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown branch.")
    if _ip_over_limit(_client_ip(request)):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests right now. Please try again later.")
    since = datetime.utcnow() - timedelta(days=1)
    recent = (
        db.query(models.CallbackRequest)
        .filter(models.CallbackRequest.mobile == payload.mobile, models.CallbackRequest.created_at >= since)
        .count()
    )
    if recent >= CALLBACKS_PER_MOBILE_PER_DAY:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="We already have your request for this number. Our team will call you soon.",
        )
    record = models.CallbackRequest(
        full_name=payload.full_name.strip(),
        mobile=payload.mobile,
        interest_type=payload.interest_type,
        interest_ref=payload.interest_ref,
        interest_label=payload.interest_label,
        amount=payload.amount,
        branch_code=payload.branch_code,
        source="kiosk",
        consent=True,
        status="new",
    )
    db.add(record)
    db.commit()
    return {"status": "received"}


def _visible_callbacks(db: Session, manager: models.User):
    """Same scoping rule as /manager/customers: a branch manager only ever sees
    their own branch; a super manager sees every branch."""
    query = db.query(models.CallbackRequest)
    if manager.role != "super_manager":
        if manager.branch_code is None:
            return query.filter(false())
        query = query.filter(models.CallbackRequest.branch_code == manager.branch_code)
    return query


@app.get("/manager/callback-requests", response_model=list[schemas.CallbackRequestOut])
def list_callback_requests(
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    manager: models.User = Depends(auth.require_manager),
):
    query = _visible_callbacks(db, manager)
    if status_filter in ("new", "contacted"):
        query = query.filter(models.CallbackRequest.status == status_filter)
    return query.order_by(models.CallbackRequest.created_at.desc()).all()


@app.patch("/manager/callback-requests/{request_id}", response_model=schemas.CallbackRequestOut)
def update_callback_request(
    request_id: int,
    payload: schemas.CallbackStatusUpdate,
    db: Session = Depends(get_db),
    manager: models.User = Depends(auth.require_manager),
):
    record = _visible_callbacks(db, manager).filter(models.CallbackRequest.id == request_id).first()
    # 404 (not 403) for other branches' requests, so their existence isn't revealed.
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")
    record.status = payload.status
    if payload.status == "contacted":
        record.contacted_at = datetime.utcnow()
        record.contacted_by_id = manager.id
    else:
        record.contacted_at = None
        record.contacted_by_id = None
    db.commit()
    db.refresh(record)
    return record
