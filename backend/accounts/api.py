from rest_framework import serializers, viewsets, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from .models import PaymentRequest
from .models import GlobalPaymentDestination
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from django.utils import timezone


class PaymentRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentRequest
        fields = ['id','vendor','receipt','note','status','created_at','processed_at']
        read_only_fields = ['id','vendor','status','created_at','processed_at']


class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user and request.user.is_authenticated and (obj.vendor == request.user or request.user.is_staff or request.user.is_superuser)


class PaymentRequestViewSet(viewsets.ModelViewSet):
    queryset = PaymentRequest.objects.all()
    serializer_class = PaymentRequestSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        # Allow authenticated users to create and list their own requests
        if self.action in ['create', 'list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        # Approve/reject must be performed by admin/staff only
        if self.action in ['approve', 'reject']:
            return [IsAdminUser()]
        # Other actions require either owner or admin
        return [permissions.IsAuthenticated(), IsOwnerOrAdmin()]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return PaymentRequest.objects.all()
        return PaymentRequest.objects.filter(vendor=user)

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        pr = self.get_object()
        if pr.status == 'approved':
            return Response({'detail': 'Already approved'}, status=status.HTTP_200_OK)
        # Optional duration in days can be provided by admin to set an expiry for this activation
        duration = request.data.get('duration_days')
        try:
            duration_days = int(duration) if duration is not None else None
        except (ValueError, TypeError):
            return Response({'detail': 'duration_days must be an integer number of days'}, status=status.HTTP_400_BAD_REQUEST)

        pr.status = 'approved'
        pr.processed_at = timezone.now()
        pr.processed_by = request.user
        pr.save(update_fields=['status', 'processed_at', 'processed_by'])
        # Activate vendor
        vendor = pr.vendor
        vendor.is_service_active = True
        vendor.is_trial = False
        # If duration_days provided, set plan to 'monthly' and set expiry accordingly; otherwise default to perpetual
        if duration_days:
            vendor.plan = 'monthly'
            vendor.plan_expires_at = timezone.now() + timezone.timedelta(days=duration_days)
        else:
            vendor.plan = 'perpetual'
            vendor.plan_expires_at = None
        vendor.save(update_fields=['is_service_active', 'is_trial', 'plan', 'plan_expires_at'])
        return Response({'detail': 'Approved and vendor activated'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        pr = self.get_object()
        if pr.status == 'rejected':
            return Response({'detail': 'Already rejected'}, status=status.HTTP_200_OK)
        pr.status = 'rejected'
        pr.processed_at = timezone.now()
        pr.processed_by = request.user
        pr.save(update_fields=['status', 'processed_at', 'processed_by'])
        return Response({'detail': 'Rejected'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def latest(self, request):
        """Return the latest payment request for the authenticated user.

        Admins may pass ?vendor_id=<id> to fetch for a specific vendor.
        """
        user = request.user
        vendor_id = request.query_params.get('vendor_id')
        qs = PaymentRequest.objects.all()
        if user.is_staff or user.is_superuser:
            if vendor_id:
                qs = qs.filter(vendor_id=vendor_id)
        else:
            qs = qs.filter(vendor=user)
        pr = qs.order_by('-created_at').first()
        if not pr:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        ser = self.get_serializer(pr)
        return Response(ser.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def history(self, request):
        """Return a list of payment requests for the authenticated user (or vendor_id if admin)."""
        user = request.user
        vendor_id = request.query_params.get('vendor_id')
        qs = PaymentRequest.objects.all()
        if user.is_staff or user.is_superuser:
            if vendor_id:
                qs = qs.filter(vendor_id=vendor_id)
        else:
            qs = qs.filter(vendor=user)
        qs = qs.order_by('-created_at')
        ser = self.get_serializer(qs, many=True)
        return Response(ser.data)


class GlobalPaymentDestinationSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalPaymentDestination
        fields = ['id', 'name', 'kind', 'details', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class GlobalPaymentDestinationViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only endpoint for owner-managed payment destinations."""
    queryset = GlobalPaymentDestination.objects.filter(is_active=True).order_by('-is_active', '-created_at')
    serializer_class = GlobalPaymentDestinationSerializer
    permission_classes = [permissions.AllowAny]
