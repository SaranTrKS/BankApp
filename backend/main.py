from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import auth
import models
import schemas
from database import Base, SessionLocal, engine, get_db, run_migrations

Base.metadata.create_all(bind=engine)
run_migrations()


def seed_manager_account() -> None:
    db = SessionLocal()
    try:
        manager = db.query(models.User).filter(models.User.username == "12345").first()
        if manager is None:
            manager = models.User(
                username="12345",
                password_hash=auth.hash_password("12345"),
                full_name="Bank Manager",
                role="manager",
            )
            db.add(manager)
            db.commit()
    finally:
        db.close()


seed_manager_account()

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


@app.post("/auth/register", response_model=schemas.UserOut, status_code=201)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")
    user = models.User(
        username=payload.username,
        password_hash=auth.hash_password(payload.password),
        full_name=payload.full_name,
        age=payload.age,
        mobile=payload.mobile,
        email=payload.email,
        role="customer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/login", response_model=schemas.Token)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if user is None or not auth.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
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
def list_customers_with_applications(
    db: Session = Depends(get_db),
    _manager: models.User = Depends(auth.require_manager),
):
    customers = (
        db.query(models.User)
        .filter(models.User.role == "customer")
        .filter((models.User.loan_applications.any()) | (models.User.deposit_applications.any()))
        .order_by(models.User.username)
        .all()
    )
    return customers
