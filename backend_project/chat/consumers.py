# chat/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer, AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from .models import ChatMessage, Room
from .serializers import RoomSerializer

class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        user = self.scope.get("user")
        if not user or user.is_anonymous:
            print("❌ WS Auth failed:", user)
            await self.close(code=4001)
            return

        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        print(f"{user.username} connected to {self.room_name}")

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        user = self.scope.get("user")
        room = getattr(self, "room_name", "unknown")
        print(f"{getattr(user, 'username', 'Anonymous')} disconnected from {room}")

    async def receive(self, text_data):
        """Receive a message from WebSocket."""
        user = self.scope.get("user")
        if not user or user.is_anonymous:
            return

        data = json.loads(text_data)
        message = data.get("message", "").strip()
        if not message:
            return

        chat_message = await self.save_message(self.room_name, user, message)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "id": chat_message.id,
                "message": chat_message.message,
                "sender": user.username,
                "timestamp": chat_message.timestamp.isoformat(),
            }
        )

    async def chat_message(self, event):
        """Send a message to WebSocket clients."""
        await self.send(text_data=json.dumps({
            "id": event["id"],
            "sender": event["sender"],
            "message": event["message"],
            "timestamp": event["timestamp"],
        }))

    @database_sync_to_async
    def save_message(self, room_name, sender, message):
        """Persist message to database."""
        return ChatMessage.objects.create(
            room=room_name,
            sender=sender,
            message=message
        )
    
class RoomConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.accept()
        # join a global group for all users
        await self.channel_layer.group_add("rooms", self.channel_name)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("rooms", self.channel_name)

    # called by the backend to broadcast room creation
    async def room_created(self, event):
        await self.send_json({
            "type": "room_created",
            "room": event["room"],
        })