from rest_framework import serializers
from .models import Query


class QuerySerializer(serializers.ModelSerializer):
    class Meta:
        model = Query
        fields = [
            "id",
            "order",
            "vendor",
            "message",
            "contact",
            "reply",
            "status",
            "customer_chat_id",
            "notified_at",
            "timestamp",
        ]
        read_only_fields = ["id", "timestamp", "vendor", "notified_at"]

    def validate_message(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Message cannot be empty.")
        return value

    def update(self, instance, validated_data):
        # If reply provided and status still pending, bump to replied
        reply = validated_data.get("reply")
        if reply and not validated_data.get("status"):
            validated_data["status"] = "replied"
        return super().update(instance, validated_data)
