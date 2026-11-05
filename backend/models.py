from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

import branches
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    # Legacy password-login column. No longer written to (auth is email-OTP-only,
    # see auth.py) but kept NOT NULL to avoid a SQLite table-rebuild migration —
    # every account gets "" here, which is never checked against anything.
    password_hash = Column(String(200), nullable=False, default="")
    full_name = Column(String(120), nullable=True)
    age = Column(Integer, nullable=True)
    mobile = Column(String(15), nullable=True)
    # The login identity. Uniqueness is enforced at the application level (see
    # main.py's signup/request-otp checks) rather than a DB constraint, since an
    # already-existing table isn't retroactively altered to add one.
    email = Column(String(120), nullable=True, unique=True, index=True)
    email_verified = Column(Boolean, nullable=False, default=False)
    otp_hash = Column(String(64), nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    otp_attempts = Column(Integer, nullable=False, default=0)
    # Signup details are staged here, not written to full_name/age/mobile above,
    # until the OTP is actually verified — otherwise anyone who knows an email
    # address could overwrite an existing (but not-yet-"verified", e.g. because
    # this column didn't exist until they logged in once since) account's real
    # profile just by calling /auth/signup, with no proof they control that inbox.
    pending_full_name = Column(String(120), nullable=True)
    pending_age = Column(Integer, nullable=True)
    pending_mobile = Column(String(15), nullable=True)
    # Customers: the home branch they chose at signup (a code from branches.py).
    # Managers: their branch, derived from their email on every sign-in.
    # Super managers: None. Staged in pending_branch_code like the fields above.
    branch_code = Column(Integer, nullable=True, index=True)
    pending_branch_code = Column(Integer, nullable=True)
    role = Column(String(20), nullable=False, default="customer")  # "customer" | "manager" | "super_manager"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    loan_applications = relationship("LoanApplication", back_populates="user")
    deposit_applications = relationship("DepositApplication", back_populates="user")

    @property
    def branch_name(self) -> str | None:
        return branches.branch_name(self.branch_code)


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


class CallbackRequest(Base):
    """A "please call me back" request left at a kiosk, without signing in.

    The mobile number is NOT verified (no SMS provider) — the dashboard labels it
    so. created_at is naive UTC (like User.otp_expires_at) so the per-mobile
    rate-limit comparison behaves the same on SQLite and Postgres."""

    __tablename__ = "callback_requests"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    mobile = Column(String(15), nullable=False, index=True)
    interest_type = Column(String(20), nullable=False)  # "deposit" | "loan" | "general"
    interest_ref = Column(String(50), nullable=True)  # scheme id / loan type id
    interest_label = Column(String(120), nullable=True)  # human-readable, e.g. "Gold Loan"
    amount = Column(Numeric(12, 2), nullable=True)
    branch_code = Column(Integer, nullable=False, index=True)
    source = Column(String(20), nullable=False, default="kiosk")
    consent = Column(Boolean, nullable=False, default=False)
    status = Column(String(20), nullable=False, default="new")  # "new" | "contacted"
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    contacted_at = Column(DateTime, nullable=True)
    contacted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    contacted_by = relationship("User")

    @property
    def branch_name(self) -> str | None:
        return branches.branch_name(self.branch_code)

    @property
    def contacted_by_username(self) -> str | None:
        return self.contacted_by.username if self.contacted_by else None
