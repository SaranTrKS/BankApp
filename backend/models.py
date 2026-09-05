from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(200), nullable=False)
    full_name = Column(String(120), nullable=True)
    age = Column(Integer, nullable=True)
    mobile = Column(String(15), nullable=True)
    email = Column(String(120), nullable=True)
    role = Column(String(20), nullable=False, default="customer")  # "customer" | "manager"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    loan_applications = relationship("LoanApplication", back_populates="user")
    deposit_applications = relationship("DepositApplication", back_populates="user")


class LoanApplication(Base):
    __tablename__ = "loan_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    full_name = Column(String(120), nullable=False)
    mobile = Column(String(15), nullable=False)
    email = Column(String(120), nullable=True)
    loan_type = Column(String(50), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    tenure_months = Column(Integer, nullable=False)
    purpose = Column(Text, nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="loan_applications")

    @property
    def username(self) -> str:
        return self.user.username


class DepositApplication(Base):
    __tablename__ = "deposit_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scheme_id = Column(String(50), nullable=False)
    scheme_name = Column(String(120), nullable=False)
    customer_type = Column(String(20), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    tenure_days = Column(Integer, nullable=False)
    projected_value = Column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="deposit_applications")

    @property
    def username(self) -> str:
        return self.user.username
