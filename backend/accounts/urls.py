from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VendorViewSet, BroadcastMessageViewSet, BankDetailViewSet, PlanUpgradeView, DailyUsageView
from .api import PaymentRequestViewSet, GlobalPaymentDestinationViewSet
from .sse import payment_request_stream
from .auth_views import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    logout,
    signup, 
    request_password_reset, 
    confirm_password_reset
)
from .dashboard import DashboardSummaryView
from accounts.models import Vendor

app_name = "accounts"

router = DefaultRouter()
router.register(r"vendors", VendorViewSet, basename="vendor")
router.register(r"broadcasts", BroadcastMessageViewSet, basename="broadcast")
router.register(r"broadcast-messages", BroadcastMessageViewSet, basename="broadcast_messages")  # Alias to match frontend
router.register(r"bank-details", BankDetailViewSet, basename="bank_detail")
router.register(r"payment-requests", PaymentRequestViewSet, basename="payment_request")
router.register(r"global-payment-destinations", GlobalPaymentDestinationViewSet, basename='global_payment_destination')

urlpatterns = [
    # Custom JWT authentication with email support
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('token/logout/', logout, name='token_logout'),
    
    # Custom authentication endpoints
    path('signup/', signup, name='signup'),
    path('password-reset/', request_password_reset, name='password_reset'),
    path('password-reset/confirm/', confirm_password_reset, name='password_reset_confirm'),
    path('upgrade/', PlanUpgradeView.as_view(), name='plan_upgrade'),
    path('daily-usage/', DailyUsageView.as_view(), name='daily_usage'),

    # Vendor management
    path('vendors/', VendorViewSet.as_view({'get': 'list', 'post': 'create'}), name='vendor_list'),
    path('vendors/me/', VendorViewSet.as_view({'get': 'me', 'patch': 'me'}), name='vendor_me'),
    path('vendors/<int:pk>/', VendorViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='vendor_detail'),
    path('vendors/onboarding/', VendorViewSet.as_view({'get': 'onboarding'}), name='vendor_onboarding'),
    path('dashboard-summary/', DashboardSummaryView.as_view(), name='dashboard_summary'),
    # Convenience explicit route for broadcast send-to-bot (kebab-case)
    path('broadcast-messages/<int:pk>/send-to-bot/', BroadcastMessageViewSet.as_view({'post': 'send_to_bot'}), name='broadcast-send-to-bot'),

    # Vendor endpoints
    path("", include(router.urls)),
    path('payment-requests/stream/', payment_request_stream, name='payment_request_stream'),
]
