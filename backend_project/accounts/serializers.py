#accounts/serializers.py
from rest_framework import serializers
from .models import User
from django.contrib.auth.password_validation import validate_password

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "is_active", "last_login", "date_joined", "phone_number", "is_online", "last_seen"]

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "password2", "role", "phone_number"]

    def validate_phone_number(self, value):
        if value:
            value = value.strip()
            if not value.startswith("+"):
                raise serializers.ValidationError("Phone number must start with '+' and country code.")
        return value
    
    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Passwords must match"})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.is_online = False 
        user.save()
        return user