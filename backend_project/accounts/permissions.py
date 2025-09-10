#accounts/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsViewer(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "viewer"

class IsClient(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "client"

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"

class ReadOnlyForViewer(BasePermission):
    """
    Viewers can only read (GET, HEAD, OPTIONS).
    Clients/Admins can do other actions.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role == "viewer":
            return request.method in SAFE_METHODS
        return True

class IsOwnerOrAdmin(BasePermission):
    """
    Only the owner of the object or admin can edit/delete it.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        return obj.owner == request.user
    
class CanEditStatus(BasePermission):
    """
    Allow admins and viewers to update status.
    Clients can only read.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        if request.method == "PATCH" and request.user.role in ["admin", "viewer"]:
            return True

        return False