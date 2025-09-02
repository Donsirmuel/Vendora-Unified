from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import VendorViewSet, BroadcastMessageViewSet, BankDetailViewSet
from .auth_views import (
    CustomTokenObtainPairView,
    signup, 
    request_password_reset, 
    confirm_password_reset
)
from accounts.models import Vendor

app_name = "accounts"

router = DefaultRouter()
router.register(r"vendors", VendorViewSet, basename="vendor")
router.register(r"broadcasts", BroadcastMessageViewSet, basename="broadcast")
router.register(r"broadcast-messages", BroadcastMessageViewSet, basename="broadcast_messages")  # Alias to match frontend
router.register(r"bank-details", BankDetailViewSet, basename="bank_detail")

urlpatterns = [
    # Custom JWT authentication with email support
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Custom authentication endpoints
    path('signup/', signup, name='signup'),
    path('password-reset/', request_password_reset, name='password_reset'),
    path('password-reset/confirm/', confirm_password_reset, name='password_reset_confirm'),

    # Vendor management
    path('vendors/', VendorViewSet.as_view({'get': 'list', 'post': 'create'}), name='vendor_list'),
    path('vendors/me/', VendorViewSet.as_view({'get': 'me', 'patch': 'me'}), name='vendor_me'),
    path('vendors/<int:pk>/', VendorViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='vendor_detail'),

    # Vendor endpoints
    path("", include(router.urls)),
]
