#accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

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

    def is_viewer(self):
        return self.role == self.Roles.VIEWER

    def is_client(self):
        return self.role == self.Roles.CLIENT

    def is_admin(self):
        return self.role == self.Roles.ADMIN
    
class FailedLoginAttempt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="failed_logins")
    timestamp = models.DateTimeField(default=timezone.now)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.user.username} at {self.timestamp}"