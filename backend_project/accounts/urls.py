#accounts/urls.py
from django.urls import path
from .views import RegisterView, UserView, list_users, AdminUserDetailView, custom_login, user_stats
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", custom_login, name="custom_login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", UserView.as_view(), name="user"),
    path("users/", list_users, name="list_users"),
    path("users/<int:pk>/", AdminUserDetailView.as_view(), name="user_detail"),
    path("user-stats/", user_stats, name="user-stats"),
]