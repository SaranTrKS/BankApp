"""Email-OTP sign-in + manager assignment configuration for this demo app.

Fill in the Brevo values below before login will work — see
docs/auth-and-manager.md for how to get them. Nothing else in the codebase
needs to change to add or remove a manager: just edit MANAGER_EMAILS — the
next time that person signs in (or signs up), their role is re-checked
against this list.
"""

import os

# From https://app.brevo.com -> SMTP & API -> API Keys -> "Generate a new API key".
# Set it as the BREVO_API_KEY environment variable (never commit the key).
BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")

# The sender address OTP emails appear to come from. Must be a "verified
# sender" in your Brevo account (Senders, Domains & Dedicated IPs -> Senders ->
# Add a sender -> verify via the confirmation link Brevo emails to that
# address) — Brevo rejects sending from an address it hasn't verified.
FROM_EMAIL = "saranravali@gmail.com"
FROM_NAME = "DCCB-VZM BankApp"

# Every address here becomes a bank manager the next time they sign in (or
# sign up). Everyone else who verifies their email is a regular customer.
MANAGER_EMAILS = {
    "saranravali@gmail.com",
}
