from rest_framework import serializers
from .models import Transaction

class TransactionSerializer(serializers.ModelSerializer):
    order_code = serializers.SerializerMethodField()
    order_type = serializers.SerializerMethodField()
    order_asset = serializers.SerializerMethodField()
    order_amount = serializers.SerializerMethodField()
    class Meta:
        model = Transaction
        fields = [
            "id",
            "order",
            "order_code",
            "order_type",
            "order_asset",
            "order_amount",
            "proof",
            "status",
            "completed_at",
            "customer_receiving_details",
            "customer_note",
            "vendor_proof",
            "vendor_completed_at",
        ]
        read_only_fields = ["id"]

    def get_order_code(self, obj: Transaction):
        try:
            oc = getattr(obj.order, "order_code", None)
            if oc:
                return oc
            oid = getattr(obj.order, "id", None)
            return str(oid) if oid is not None else ""
        except Exception:
            return ""

    def get_order_type(self, obj: Transaction):
        try:
            return obj.order.type
        except Exception:
            return ""

    def get_order_asset(self, obj: Transaction):
        try:
            return obj.order.asset
        except Exception:
            return ""

    def get_order_amount(self, obj: Transaction):
        try:
            return obj.order.amount
        except Exception:
            return None

    def validate_status(self, value: str) -> str:
        if value not in {"uncompleted", "completed", "declined", "expired"}:
            raise serializers.ValidationError("Invalid status.")
        return value
