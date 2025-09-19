#files/utils.py
import os
from .models import AuditLog
from twilio.rest import Client
import logging

logger = logging.getLogger(__name__)

def get_client_ip(request):
    """Extract client IP address safely"""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0]
    return request.META.get("REMOTE_ADDR")

def log_action(user, action, status="success", ip=None):
    """Create an audit log entry"""
    AuditLog.objects.create(
        user=user if user.is_authenticated else None,
        action=action,
        status=status,
        ip_address=ip,
    )

def send_rejection_sms(phone_number, file_name, use_mock=True):
    """
    Send SMS notification when a file is rejected.
    If use_mock=True, logs the message instead of sending via Twilio.
    """
    message = f"Your uploaded file '{file_name}' has been rejected. Please check your account for details."

    if use_mock:
        logger.info(f"[MOCK SMS] To: {phone_number} | Message: {message}")
        print(f"[MOCK SMS] To: {phone_number} | Message: {message}")
        return True

    from twilio.rest import Client

    account_sid = os.getenv("TWILIO_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_FROM")

    if not all([account_sid, auth_token, from_number]):
        logger.error("Twilio credentials not set in environment variables")
        return

    client = Client(account_sid, auth_token)
    try:
        msg = client.messages.create(
            body=message,
            from_=from_number,
            to=phone_number
        )
        logger.info(f"Sent rejection SMS to {phone_number}, SID: {msg.sid}")
    except Exception as e:
        logger.error(f"Failed to send rejection SMS to {phone_number}: {str(e)}")