from rest_framework import serializers
from .models import Order

class OrderSerializer(serializers.ModelSerializer):
    order_type = serializers.CharField(source='type', read_only=True)  # Frontend expects 'order_type'
    
    class Meta:
        model = Order
        fields = [
            "id", "vendor", "customer_chat_id", "customer_name", "asset", 
            "type", "order_type", "amount", "rate", "total_value", "status", 
            "auto_expire_at", "rejection_reason", "acceptance_note",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "total_value", "created_at", "updated_at"]
        extra_kwargs = {
            "status": {"required": False},
            "vendor": {"required": False},  # Will be set from request.user
        }

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive.")
        return value