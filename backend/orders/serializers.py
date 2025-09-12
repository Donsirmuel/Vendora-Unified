from rest_framework import serializers
from .models import Order

class OrderSerializer(serializers.ModelSerializer):
    order_type = serializers.CharField(source='type', read_only=True)  # Frontend expects 'order_type'
    vendor_name = serializers.SerializerMethodField()
    vendor_email = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            "id", "order_code", "vendor", "vendor_name", "vendor_email", "customer_chat_id", "customer_name", "asset", 
            "type", "order_type", "amount", "rate", "total_value", "status", 
            "pay_instructions", "send_instructions", "auto_expire_at", "rejection_reason", "acceptance_note",
            "accepted_at", "declined_at", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "order_code", "total_value", "accepted_at", "declined_at", "created_at", "updated_at"]
        extra_kwargs = {
            "status": {"required": False},
            "vendor": {"required": False},  # Will be set from request.user
        }

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive.")
        return value

    def get_vendor_name(self, obj: Order):
        try:
            return obj.vendor.name
        except Exception:
            return ""

    def get_vendor_email(self, obj: Order):
        try:
            return obj.vendor.email
        except Exception:
            return ""

    def to_representation(self, instance: Order):
        data = super().to_representation(instance)
        # Ensure total_value is populated even for legacy rows
        try:
            if data.get("total_value") in (None, "", "null"):
                from decimal import Decimal
                amt = instance.amount
                rt = instance.rate
                if amt is not None and rt is not None:
                    try:
                        amt_d = amt if isinstance(amt, Decimal) else Decimal(str(amt))
                        rt_d = rt if isinstance(rt, Decimal) else Decimal(str(rt))
                        data["total_value"] = amt_d * rt_d
                    except Exception:
                        data["total_value"] = float(amt) * float(rt)
        except Exception:
            pass
        # If instructions are empty, enrich from vendor defaults
        try:
            if instance.type == Order.BUY and not instance.pay_instructions:
                from accounts.models import BankDetail
                bd = BankDetail._default_manager.filter(vendor=instance.vendor).order_by('-is_default','-created_at').first()
                if bd:
                    data["pay_instructions"] = (
                        f"Bank: {bd.bank_name}\nAccount Name: {bd.account_name}\nAccount Number: {bd.account_number}\n"
                        + (f"Instructions: {bd.instructions}" if bd.instructions else "")
                    )
                else:
                    # Fallback to vendor's plain bank_details or rate.bank_details when no structured record exists
                    try:
                        vend_text = (getattr(instance.vendor, "bank_details", "") or "").strip()
                        if vend_text:
                            data["pay_instructions"] = vend_text
                        else:
                            from rates.models import Rate
                            rate = Rate._default_manager.filter(vendor=instance.vendor, asset=instance.asset).first()
                            if rate and rate.bank_details:
                                data["pay_instructions"] = rate.bank_details
                    except Exception:
                        pass
            if instance.type == Order.SELL and not instance.send_instructions:
                from rates.models import Rate
                rate = Rate._default_manager.filter(vendor=instance.vendor, asset=instance.asset).first()
                if rate and rate.contract_address:
                    data["send_instructions"] = rate.contract_address
        except Exception:
            pass
        return data