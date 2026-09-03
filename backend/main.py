from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, engine, get_db

Base.metadata.create_all(bind=engine)

app = FastAPI(title="BankApp API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/loan-applications", response_model=schemas.LoanApplicationOut, status_code=201)
def create_loan_application(payload: schemas.LoanApplicationCreate, db: Session = Depends(get_db)):
    record = models.LoanApplication(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/loan-applications", response_model=list[schemas.LoanApplicationOut])
def list_loan_applications(db: Session = Depends(get_db)):
    return db.query(models.LoanApplication).order_by(models.LoanApplication.created_at.desc()).all()
