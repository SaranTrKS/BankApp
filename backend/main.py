import re

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy.orm import Session

import auth
import google_config
import models
import schemas
from database import Base, engine, get_db, run_migrations

Base.metadata.create_all(bind=engine)
run_migrations()

app = FastAPI(title="BankApp API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://127.0.0.1:4200"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


def _derive_unique_username(db: Session, email: str, display_name: str | None) -> str:
    """Turn a Google email/name into a display username that doesn't collide with an existing one."""
    base = re.sub(r"[^a-zA-Z0-9_]", "", (display_name or email.split("@")[0]).replace(" ", "_")) or "user"
    base = base[:40]
    candidate = base
    suffix = 1
    while db.query(models.User).filter(models.User.username == candidate).first() is not None:
        suffix += 1
        candidate = f"{base}{suffix}"
    return candidate


@app.post("/auth/google", response_model=schemas.Token)
def google_login(payload: schemas.GoogleLoginRequest, db: Session = Depends(get_db)):
    if not google_config.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google Sign-In isn't configured yet — set GOOGLE_CLIENT_ID in backend/google_config.py.",
        )
    try:
        idinfo = id_token.verify_oauth2_token(
            payload.credential, google_requests.Request(), google_config.GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google credential.")

    if not idinfo.get("email_verified"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google account email is not verified.")

    email = idinfo["email"].lower()
    google_sub = idinfo["sub"]
    desired_role = "manager" if email in google_config.MANAGER_EMAILS else "customer"

    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        user = models.User(
            username=_derive_unique_username(db, email, idinfo.get("name")),
            email=email,
            google_sub=google_sub,
            full_name=idinfo.get("name"),
            role=desired_role,
        )
        db.add(user)
    else:
        # Re-sync role on every login so editing MANAGER_EMAILS takes effect on next sign-in,
        # with no manual DB edit or migration needed.
        user.google_sub = google_sub
        user.role = desired_role
    db.commit()
    db.refresh(user)

    token = auth.create_access_token(user)
    return schemas.Token(access_token=token, role=user.role, username=user.username)


@app.get("/auth/me", response_model=schemas.UserOut)
def get_current_user_profile(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@app.patch("/auth/complete-profile", response_model=schemas.UserOut)
def complete_profile(
    payload: schemas.CompleteProfileRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    current_user.age = payload.age
    current_user.mobile = payload.mobile
    db.commit()
    db.refresh(current_user)
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
