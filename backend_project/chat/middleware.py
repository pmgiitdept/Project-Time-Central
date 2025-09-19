# chat/middleware.py
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

User = get_user_model()

@database_sync_to_async
def get_user_from_token(token):
    """Return a User instance from JWT token or None."""
    try:
        access_token = AccessToken(token)
        user_id = access_token["user_id"]
        return User.objects.get(id=user_id)
    except (TokenError, User.DoesNotExist, Exception):
        return None

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        from django.contrib.auth.models import AnonymousUser  

        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token = params.get("token", [None])[0]

        user = None
        if token:
            user = await get_user_from_token(token)

        scope["user"] = user or AnonymousUser()
        return await super().__call__(scope, receive, send)