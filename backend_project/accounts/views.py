#accounts/views.py
from rest_framework import generics, permissions, status
from rest_framework.permissions import IsAdminUser, AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from django.db.models import Count, Q
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth
from django.utils import timezone
from .models import User
from .serializers import UserSerializer, RegisterSerializer
from datetime import timedelta

ONLINE_TIMEOUT = timedelta(minutes=5)
# -----------------------------
# AUTH & REGISTRATION
# -----------------------------
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        user.is_online = True     
        user.last_seen = timezone.now()  
        user.save(update_fields=["is_online", "last_seen"])

        data["role"] = self.user.role.lower()
        data["username"] = self.user.username
        return data


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

@api_view(["POST"])
@permission_classes([AllowAny])
def custom_login(request):
    username = request.data.get("username")
    password = request.data.get("password")

    user = authenticate(username=username, password=password)
    if user:
        user.is_online = True 
        user.last_seen = timezone.now()
        user.save(update_fields=["is_online", "last_seen"])

        update_last_login(None, user)
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "username": user.username,
                "role": getattr(user, "role", "user"),
                "last_login": user.last_login,
            }
        )

    return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

# -----------------------------
# USER VIEWS
# -----------------------------
class UserView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    """Authenticated users can view their own profile."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class AdminUserListView(generics.ListAPIView):
    """Admins can view all users."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admins can view, update, or delete individual users."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

@api_view(["GET"])
@permission_classes([IsAdminUser])
def list_users(request):
    """Admins can get a flat list of all users (custom endpoint)."""
    now = timezone.now()
    users = User.objects.all()
    data = []

    for u in users:
        is_online = False
        if u.is_online and u.last_seen:
            if now - u.last_seen <= ONLINE_TIMEOUT:
                is_online = True

        data.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "last_login": u.last_login,
            "is_online": is_online,  
            "last_seen": u.last_seen,
        })

    return Response(data)

# -----------------------------
# USER STATS
# -----------------------------
@api_view(["GET"])
@permission_classes([IsAdminUser])
def user_stats(request):
    """Admins can view aggregated user stats by period (day/week/month)."""
    period = request.query_params.get("period", "day")

    if period == "month":
        trunc = TruncMonth("date_joined")
    elif period == "week":
        trunc = TruncWeek("date_joined")
    else:
        trunc = TruncDay("date_joined")

    stats = (
        User.objects.annotate(period=trunc)
        .values("period")
        .annotate(active=Count("id", filter=Q(is_active=True)))
        .order_by("period")
    )

    return Response(stats)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def custom_logout(request):
    user = request.user
    user.is_online = False
    user.last_seen = timezone.now()
    user.save(update_fields=["is_online", "last_seen"])
    return Response({"message": "Logged out successfully"})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def user_ping(request):
    """Update last_seen on user activity"""
    user = request.user
    user.last_seen = timezone.now()
    user.is_online = True
    user.save(update_fields=["last_seen", "is_online"])
    return Response({"status": "ok", "last_seen": user.last_seen})