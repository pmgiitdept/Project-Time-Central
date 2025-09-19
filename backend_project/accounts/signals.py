# accounts/signals.py
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from django.utils import timezone

@receiver(user_logged_in)
def mark_online(sender, user, request, **kwargs):
    user.is_online = True
    user.last_seen = timezone.now()
    user.save(update_fields=["is_online", "last_seen"])

@receiver(user_logged_out)
def mark_offline(sender, user, request, **kwargs):
    user.is_online = False
    user.last_seen = timezone.now()
    user.save(update_fields=["is_online", "last_seen"])
