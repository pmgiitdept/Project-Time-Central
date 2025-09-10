#files/models.py
from django.db import models
from django.conf import settings

def user_directory_path(instance, filename):
    return f"user_{instance.owner.id}/{filename}"

class File(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    file = models.FileField(upload_to=user_directory_path)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=20, default="pending")  

    parsed_content = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"{self.file.name} ({self.owner.username})"

class AuditLog(models.Model):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, null=True, blank=True)
    action = models.CharField(max_length=255)
    status = models.CharField(max_length=20, default="success") 
    ip_address = models.GenericIPAddressField(null=True, blank=True)  
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username if self.user else 'Unknown'} - {self.action} at {self.timestamp}"

class SystemSettings(models.Model):
    site_name = models.CharField(max_length=100, default="Project Time Central")
    max_file_size = models.IntegerField(default=50)
    allowed_types = models.JSONField(default=list)

    retention_days = models.IntegerField(default=30)
    require_verification = models.BooleanField(default=False)
    auto_archive = models.BooleanField(default=False)
    default_role = models.CharField(max_length=20, default="client")
    require_password_reset = models.BooleanField(default=False)
    auto_disable_inactive = models.IntegerField(default=0)
    log_downloads = models.BooleanField(default=False)
    max_login_attempts = models.IntegerField(default=5)
    enable_2fa = models.BooleanField(default=False)

    def __str__(self):
        return "System Settings"
