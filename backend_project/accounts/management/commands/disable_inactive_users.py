from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from accounts.models import User
from files.models import SystemSettings
from django.db.models import Q

class Command(BaseCommand):
    help = "Disable users who have been inactive past the configured days"

    def handle(self, *args, **options):
        settings = SystemSettings.objects.first()
        if not settings or not settings.auto_disable_inactive:
            self.stdout.write("Auto-disable inactive users is not configured.")
            return

        cutoff = timezone.now() - timedelta(days=settings.auto_disable_inactive)
        users_to_disable = User.objects.filter(
            is_active=True
        ).filter(
            Q(last_login__lt=cutoff) | Q(last_login__isnull=True)
        )
        count = users_to_disable.count()
        users_to_disable.update(is_active=False)

        self.stdout.write(f"Disabled {count} inactive users.")
