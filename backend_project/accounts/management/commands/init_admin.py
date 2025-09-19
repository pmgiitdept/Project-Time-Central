from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = "Create an initial superuser if none exists"

    def handle(self, *args, **options):
        User = get_user_model()
        if not User.objects.filter(username="admin").exists():
            user = User.objects.create_superuser(
                username="admin",
                email="admin@example.com",
                password="AdminPass123!"
            )
            user.role = "admin"  # adjust if your User model has a role field
            user.save()
            self.stdout.write(self.style.SUCCESS("Superuser 'admin' created."))
        else:
            self.stdout.write("Superuser 'admin' already exists.")
