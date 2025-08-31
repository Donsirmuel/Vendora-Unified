from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsOwner(BasePermission):
    """Allow access only to objects related to the requesting vendor (owner)."""

    def has_object_permission(self, request, view, obj):
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            return False
        owner = getattr(obj, "vendor", None) or getattr(obj, "owner", None)
        # Support nested ownership like Transaction.order.vendor
        if owner is None:
            related_order = getattr(obj, "order", None)
            if related_order is not None:
                owner = getattr(related_order, "vendor", None)
        return owner == user


class IsVendorAdmin(BasePermission):
    """Allow unsafe methods only to staff/superusers; safe methods for authenticated users."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


