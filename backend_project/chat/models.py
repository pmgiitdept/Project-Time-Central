# chat/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.conf import settings
import secrets, string, random

User = get_user_model()

class ChatMessage(models.Model):
    room = models.CharField(max_length=255)
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField() 
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["timestamp"]

    def __str__(self):
        return f"{self.sender.username}: {self.message[:20]}"

def generate_passkey(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

class Room(models.Model):
    name = models.CharField(max_length=255, unique=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_rooms"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="chat_rooms", blank=True
    )
    passkey = models.CharField(max_length=6, default=generate_passkey)

    def save(self, *args, **kwargs):
        if not self.passkey:  
            self.passkey = secrets.token_hex(3).upper() 
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name