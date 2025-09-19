#accounts/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Role & Contact Info", {"fields": ("role", "phone_number")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Role & Contact Info", {"fields": ("role", "phone_number")}),
    )
    list_display = ("username", "email", "role", "phone_number", "is_staff", "is_superuser", "is_active")
    list_filter = ("role", "is_superuser", "is_active")
    search_fields = ("username", "email", "phone_number")

admin.site.register(User, CustomUserAdmin)