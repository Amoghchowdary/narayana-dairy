import random
import time
import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
import jwt

SECRET_KEY = "narayana-dairy-secret-2026-change-me"
ALGORITHM  = "HS256"
TOKEN_HOURS = 24

# In-memory OTP store (perfectly fine for 2-partner app)
_otp_store: dict = {}


def load_config() -> dict:
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "partners.json")
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_partner_by_email(email: str):
    config = load_config()
    for p in config.get("partners", []):
        if p.get("email", "").lower() == email.lower():
            return p
    return None


def generate_otp() -> str:
    return str(random.randint(100000, 999999))


def save_otp(email: str, otp: str) -> None:
    _otp_store[email.lower()] = {
        "otp": otp,
        "expires_at": time.time() + 600,   # 10 minutes
    }


def verify_otp_code(email: str, otp: str) -> tuple:
    key   = email.lower()
    entry = _otp_store.get(key)
    if not entry:
        return False, "No OTP found. Please request a new one."
    if time.time() > entry["expires_at"]:
        _otp_store.pop(key, None)
        return False, "OTP expired. Please request a new one."
    if entry["otp"] != otp.strip():
        return False, "Incorrect OTP. Please try again."
    _otp_store.pop(key, None)
    return True, "verified"


def send_otp_email(partner: dict, otp: str, smtp_cfg: dict, delivery_email=None) -> None:
    """Send OTP email. delivery_email overrides the partner's own email as the recipient."""
    to_email = delivery_email or partner["email"]
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Login OTP for {partner['name']}: {otp} — Narayana Dairy"
    msg["From"]    = smtp_cfg["from_email"]
    msg["To"]      = to_email
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:440px;margin:40px auto;
                border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10);">
      <div style="background:linear-gradient(135deg,#064e3b,#10b981);padding:32px;text-align:center;">
        <div style="font-size:48px;">&#x1F404;</div>
        <h2 style="color:#fff;margin:8px 0 4px;font-size:22px;">Narayana Organic Dairy</h2>
        <p style="color:rgba(255,255,255,.7);margin:0;font-size:13px;">Partner Login OTP</p>
      </div>
      <div style="background:#fff;padding:36px;text-align:center;">
        <p style="color:#374151;font-size:16px;margin-bottom:8px;">
          Hello <strong>{partner['name']}</strong>,</p>
        <p style="color:#6b7280;font-size:14px;margin-bottom:28px;">
          Your one-time password:</p>
        <div style="background:#f0fdf4;border:2px dashed #10b981;border-radius:14px;
                    padding:28px 20px;display:inline-block;min-width:200px;">
          <div style="font-size:44px;font-weight:900;letter-spacing:14px;color:#064e3b;">
            {otp}</div>
        </div>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
          Valid for <strong>10 minutes</strong>. Never share this code.</p>
      </div>
    </div>"""
    msg.attach(MIMEText(html, "html"))
    with smtplib.SMTP_SSL(smtp_cfg.get("host", "smtp.gmail.com"),
                          smtp_cfg.get("port", 465), timeout=15) as srv:
        srv.login(smtp_cfg["username"], smtp_cfg["password"])
        srv.sendmail(smtp_cfg["from_email"], to_email, msg.as_string())


def create_access_token(email: str, name: str) -> str:
    payload = {
        "sub":  email,
        "name": name,
        "exp":  datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        return None
