#accounts/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    UserView,
    AdminUserListView,
    AdminUserDetailView,
    list_users,
    custom_login,
    user_stats,
    MyTokenObtainPairView,
    custom_logout,
    user_ping
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", custom_login, name="custom_login"),
    path("logout/", custom_logout, name="custom_logout"),
    path("token/", MyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    path("me/", UserView.as_view(), name="me"),
    path("ping/", user_ping, name="ping"),
    path("users/", list_users, name="list_users"),  
    path("users/<int:pk>/", AdminUserDetailView.as_view(), name="user_detail"),
    path("user-stats/", user_stats, name="user_stats"),
]
