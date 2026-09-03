from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, Numeric, String, Text

from database import Base


class LoanApplication(Base):
    __tablename__ = "loan_applications"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    mobile = Column(String(15), nullable=False)
    email = Column(String(120), nullable=True)
    loan_type = Column(String(50), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    tenure_months = Column(Integer, nullable=False)
    purpose = Column(Text, nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
