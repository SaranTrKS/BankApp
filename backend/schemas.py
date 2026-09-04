from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=4, max_length=72)
    full_name: str = Field(min_length=2, max_length=120)
    mobile: str = Field(pattern=r"^[6-9]\d{9}$")
    email: EmailStr | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str | None
    mobile: str | None
    email: str | None
    role: str


class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str


class LoanApplicationCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    mobile: str = Field(pattern=r"^[6-9]\d{9}$")
    email: EmailStr | None = None
    loan_type: str
    amount: float = Field(gt=0)
    tenure_months: int = Field(gt=0, le=360)
    purpose: str | None = None
    address: str | None = None


class LoanApplicationOut(LoanApplicationCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    created_at: datetime


class DepositApplicationCreate(BaseModel):
    scheme_id: str
    scheme_name: str
    customer_type: str
    amount: float = Field(gt=0)
    tenure_days: int = Field(gt=0)
    projected_value: float = Field(gt=0)


class DepositApplicationOut(DepositApplicationCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    created_at: datetime
