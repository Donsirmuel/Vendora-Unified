from rest_framework import serializers
from .models import Transaction

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ["id", "order", "proof", "status", "completed_at"]
        read_only_fields = ["id"]

    def validate_status(self, value: str) -> str:
        if not value:
            raise serializers.ValidationError("Status is required.")
        return value
