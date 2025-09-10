#accounts/views.py
from rest_framework import generics, permissions, status
from .models import User, FailedLoginAttempt
from .serializers import UserSerializer, RegisterSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import update_last_login
from django.db.models import Count, Q
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth
from files.utils import log_action, get_client_ip
from files.models import SystemSettings
from django.utils import timezone
from datetime import timedelta

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def perform_create(self, serializer):
        settings = SystemSettings.objects.first()
        default_role = getattr(settings, "default_role", "client")
        require_password_reset = getattr(settings, "require_password_reset", False)

        serializer.save(
            role=default_role,
            require_password_reset=require_password_reset
        )

class UserView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role 
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['role'] = self.user.role.lower()
        data['username'] = self.user.username
        return data

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class AdminUserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

@api_view(["GET"])
@permission_classes([IsAdminUser])
def list_users(request):
    users = User.objects.all()
    data = [{"id": u.id, "username": u.username, "email": u.email, "role": u.role, "is_active": u.is_active, "last_login": u.last_login} for u in users]
    return Response(data)

@api_view(["POST"])
@permission_classes([AllowAny])
def custom_login(request):
    username = request.data.get("username")
    password = request.data.get("password")
    settings = SystemSettings.objects.first()

    user = User.objects.filter(username=username).first()
    if not user:
        return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    # --- Check max login attempts ---
    if settings and settings.max_login_attempts:
        window = timezone.now() - timedelta(hours=1)  # 1-hour window
        recent_failures = user.failed_logins.filter(timestamp__gte=window).count()
        if recent_failures >= settings.max_login_attempts:
            return Response({"detail": "Account temporarily locked due to too many failed login attempts"}, status=403)

    authenticated_user = authenticate(username=username, password=password)
    if authenticated_user:
        # --- Clear previous failed attempts on successful login ---
        user.failed_logins.all().delete()
        update_last_login(None, authenticated_user)

        refresh = RefreshToken.for_user(authenticated_user)

        log_action(authenticated_user, "login", ip=get_client_ip(request))

        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "username": user.username,
            "role": getattr(user, "role", "user"),
            "last_login": user.last_login,
        })

    # --- Failed login tracking ---
    FailedLoginAttempt.objects.create(user=user)
    return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

def disable_inactive_users():
    settings = SystemSettings.objects.first()
    if not settings or not settings.auto_disable_inactive:
        return

    cutoff = timezone.now() - timedelta(days=settings.auto_disable_inactive)
    users_to_disable = User.objects.filter(is_active=True, last_login__lt=cutoff)
    users_to_disable.update(is_active=False)

@api_view(["GET"])
@permission_classes([IsAdminUser])
def user_stats(request):
    period = request.query_params.get("period", "day")  

    if period == "month":
        trunc = TruncMonth("date_joined")
    elif period == "week":
        trunc = TruncWeek("date_joined")
    else:
        trunc = TruncDay("date_joined")

    stats = (
        User.objects
        .annotate(period=trunc)
        .values("period")
        .annotate(
            active=Count("id", filter=Q(is_active=True))
        )
        .order_by("period")
    )

    return Response(stats)