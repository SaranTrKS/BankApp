"""Sends transactional email via Brevo's HTTP API (no SMTP, no extra dependency
beyond `requests`, which is already installed). See docs/auth-and-manager.md
for how to get an API key and verify a sender address.
"""

import requests

BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"


class EmailSendError(Exception):
    pass


def send_otp_email(api_key: str, from_email: str, from_name: str, to_email: str, otp: str) -> None:
    try:
        response = requests.post(
            BREVO_SEND_URL,
            headers={"api-key": api_key, "content-type": "application/json", "accept": "application/json"},
            json={
                "sender": {"name": from_name, "email": from_email},
                "to": [{"email": to_email}],
                "subject": "Your DCCB-VZM BankApp verification code",
                "htmlContent": (
                    f"<p>Your one-time verification code is <strong>{otp}</strong>.</p>"
                    f"<p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>"
                ),
                "textContent": f"Your one-time verification code is {otp}. It expires in 10 minutes.",
            },
            timeout=10,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise EmailSendError(str(exc)) from exc
