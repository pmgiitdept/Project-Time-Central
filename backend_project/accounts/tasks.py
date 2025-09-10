# accounts/tasks.py
from celery import shared_task
from django.core.management import call_command

@shared_task
def disable_inactive_users_task():
    call_command("disable_inactive_users")