from rest_framework import serializers
from .models import Rate

class RateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rate
        fields = [
            "id",
            "vendor",
            "asset",
            "buy_rate",
            "sell_rate",
            "contract_address",
            "bank_details",
        ]
        read_only_fields = ["id", "vendor"]

    def validate_buy_rate(self, value):
        if value <= 0:
            raise serializers.ValidationError("Buy rate must be positive.")
        return value

    def validate_sell_rate(self, value):
        if value <= 0:
            raise serializers.ValidationError("Sell rate must be positive.")
        return value
