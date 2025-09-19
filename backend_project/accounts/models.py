#accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.core.validators import RegexValidator

class User(AbstractUser):
    class Roles(models.TextChoices):
        VIEWER = "viewer", "Viewer"
        CLIENT = "client", "Client"
        ADMIN = "admin", "Admin"

    role = models.CharField(
        max_length=20,
        choices=Roles.choices,
        default=Roles.VIEWER,
    )

    phone_regex = RegexValidator(
        regex=r'^\+?\d{10,15}$',
        message="Phone number must be in the format: '+639XXXXXXXXX' with 10-15 digits."
    )
    phone_number = models.CharField(
        validators=[phone_regex],
        max_length=15,
        blank=True,
        null=True
    )

    is_staff = models.BooleanField(
        default=True,
        help_text="Designates whether the user can log into the admin site. Always True for all users."
    )
    
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)

    def is_viewer(self):
        return self.role == self.Roles.VIEWER

    def is_client(self):
        return self.role == self.Roles.CLIENT

    def is_admin(self):
        return self.role == self.Roles.ADMIN

    is_staff = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        self.is_staff = True 
        self.is_superuser = self.role == self.Roles.ADMIN
        super().save(*args, **kwargs)
    
class FailedLoginAttempt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="failed_logins")
    timestamp = models.DateTimeField(default=timezone.now)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.user.username} at {self.timestamp}"
    
class SMSLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    phone_number = models.CharField(max_length=15)
    message = models.TextField()
    sent_at = models.DateTimeField(default=timezone.now)
    mock = models.BooleanField(default=True) 

    def __str__(self):
        return f"{self.phone_number} | {self.sent_at} | {'MOCK' if self.mock else 'REAL'}"