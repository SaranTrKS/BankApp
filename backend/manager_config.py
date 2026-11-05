"""Email-OTP sign-in + role assignment configuration for this demo app.

Fill in the Brevo values below before login will work — see
docs/auth-and-manager.md for how to get them.

Roles are decided from the email at every sign-in (no DB edits needed):
- SUPER_MANAGER_EMAILS below -> "super_manager" (sees every branch's customers)
- a branch email in branches.py -> "manager" of that branch only
- anyone else -> "customer"
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

# Every address here becomes a super manager the next time they sign in.
# Lowercase only — sign-in emails are lowercased before comparing.
SUPER_MANAGER_EMAILS = {
    "saranravali@gmail.com",
    "nivineeru228@gmail.com",
    "vzmco201@dccbvzm.org",
}
