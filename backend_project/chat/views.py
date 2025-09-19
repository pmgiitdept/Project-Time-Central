# chat/views.py
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import ChatMessage, Room
from .serializers import ChatMessageSerializer, RoomSerializer
from rest_framework import generics, viewsets, permissions, status
from django.shortcuts import get_object_or_404
from accounts.serializers import UserSerializer
from accounts.models import User

class ChatMessageListView(generics.ListAPIView):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        room_name = self.kwargs["room_name"]
        return ChatMessage.objects.filter(room=room_name).order_by("timestamp")

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_messages(request, room_name):
    """Fallback API if you want manual responses (optional)."""
    messages = (
        ChatMessage.objects.filter(room=room_name)
        .select_related("sender")
        .order_by("-timestamp")
    )
    serializer = ChatMessageSerializer(messages, many=True)
    return Response(serializer.data)

class IsCreatorOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Only allow creator to delete
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.created_by == request.user
    
class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated, IsCreatorOrReadOnly]

    @action(detail=True, methods=["post"])
    def join(self, request, pk=None):
        room = get_object_or_404(Room, pk=pk)
        user = request.user
        provided_passkey = request.data.get("passkey")

        if not provided_passkey or provided_passkey != room.passkey:
            return Response(
                {"error": "Invalid or missing passkey."},
                status=status.HTTP_403_FORBIDDEN
            )

        room.participants.add(user)
        return Response(
            {"message": f"{user.username} joined {room.name}"},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"])
    def leave(self, request, pk=None):
        room = get_object_or_404(Room, pk=pk)
        user = request.user

        room.participants.remove(user)
        return Response(
            {"message": f"{user.username} left {room.name}"},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=["get"])
    def participants(self, request, pk=None):
        """
        Return all participants of a room
        """
        room = self.get_object()
        serializer = UserSerializer(room.participants.all(), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=["post"])
    def remove_user(self, request, pk=None):
        room = self.get_object()
        user_id = request.data.get("user_id")

        if not user_id:
            return Response({"error": "user_id is required."}, status=400)

        if request.user != room.created_by:
            return Response({"error": "Only the creator can remove users."}, status=403)

        user_to_remove = get_object_or_404(User, id=user_id)

        if user_to_remove == room.created_by:
            return Response({"error": "Creator cannot remove themselves."}, status=400)

        if user_to_remove not in room.participants.all():
            return Response({"error": "User is not in the room."}, status=400)

        room.participants.remove(user_to_remove)

        return Response(
            {"message": f"{user_to_remove.username} removed from room."},
            status=200
        )
