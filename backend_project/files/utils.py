from .models import AuditLog

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
