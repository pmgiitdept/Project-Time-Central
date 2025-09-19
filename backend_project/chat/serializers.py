# chat/serializers.py
from rest_framework import serializers
from .models import ChatMessage, Room

class ChatMessageSerializer(serializers.ModelSerializer):
    sender = serializers.CharField(source="sender.username", read_only=True)

    class Meta:
        model = ChatMessage
        fields = ["id", "sender", "message", "timestamp", "room"]

class RoomSerializer(serializers.ModelSerializer):
    participants = serializers.StringRelatedField(many=True, read_only=True)
    is_joined = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    passkey = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            "id", "name", "created_by", "created_at",
            "participants", "is_joined", "created_by_username", "passkey"
        ]
        read_only_fields = ["id", "created_by", "created_at", "participants", "passkey"]

    def get_is_joined(self, obj):
        user = self.context["request"].user
        return obj.participants.filter(id=user.id).exists()

    def get_passkey(self, obj):
        user = self.context["request"].user
        return obj.passkey if obj.created_by == user else None

    def create(self, validated_data):
        user = self.context["request"].user
        room = Room.objects.create(created_by=user, **validated_data)
        room.participants.add(user)  
        return room
