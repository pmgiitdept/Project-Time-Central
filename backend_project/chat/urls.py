# chat/urls.py
from django.urls import path, include
from .views import ChatMessageListView, get_messages, RoomViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r"rooms", RoomViewSet, basename="room")

urlpatterns = [
    path("messages/<str:room_name>/", ChatMessageListView.as_view(), name="chat-messages"),
    path("messages-alt/<str:room_name>/", get_messages, name="chat-messages"),
    path("", include(router.urls)),
]