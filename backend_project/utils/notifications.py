# utils/notifications.py
import os
import logging
from accounts.models import SMSLog  
from twilio.rest import Client

logger = logging.getLogger(__name__)
MOCK_SMS = True  

def send_rejection_sms(phone_number, file_name, user=None):
    """
    Send SMS notification or mock it.
    Logs all SMS messages to the database.
    """
    message = f"Your uploaded file '{file_name}' has been rejected. Please check your account for details."

    if MOCK_SMS:
        print(f"[MOCK SMS] To: {phone_number} | Message: {message}")
        SMSLog.objects.create(user=user, phone_number=phone_number, message=message, mock=True)
        return

    account_sid = os.getenv("TWILIO_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_FROM")

    if not all([account_sid, auth_token, from_number]):
        logger.error("Twilio credentials not set in environment variables")
        return

    try:
        client = Client(account_sid, auth_token)
        msg = client.messages.create(body=message, from_=from_number, to=phone_number)
        logger.info(f"Sent rejection SMS to {phone_number}, SID: {msg.sid}")
        SMSLog.objects.create(user=user, phone_number=phone_number, message=message, mock=False)
    except Exception as e:
        logger.error(f"Failed to send rejection SMS to {phone_number}: {str(e)}")