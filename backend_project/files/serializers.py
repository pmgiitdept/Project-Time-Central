# files/serializers.py
from rest_framework import serializers
from .models import File

class FileSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")

    class Meta:
        model = File
        fields = ["id", "owner", "file", "uploaded_at", "updated_at", "status"]
        # read_only_fields = ["status"]  # remove this line

class FileStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ["status"] 