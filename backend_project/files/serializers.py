# files/serializers.py
from rest_framework import serializers
from .models import File, AuditLog, SystemSettings

class FileSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")

    class Meta:
        model = File
        fields = ["id", "owner", "file", "uploaded_at", "updated_at", "status"]

class FileStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ["status"]

class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.username", read_only=True)
    role = serializers.ReadOnlyField(source="user.role", read_only=True) 

    class Meta:
        model = AuditLog
        fields = ["id", "user", "role", "action", "status", "ip_address", "timestamp"]

class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = "__all__"
