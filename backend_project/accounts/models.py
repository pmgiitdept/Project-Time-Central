#accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

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