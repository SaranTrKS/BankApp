from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


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
    created_at: datetime
