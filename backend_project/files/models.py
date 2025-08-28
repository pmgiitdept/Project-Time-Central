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

    def __str__(self):
        return f"{self.file.name} ({self.owner.username})"
