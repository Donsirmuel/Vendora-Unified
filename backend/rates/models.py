from django.db import models
from django.conf import settings

# Create your models here.
class Rate(models.Model):
    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    asset = models.CharField(max_length=50)
    buy_rate = models.DecimalField(max_digits=20, decimal_places=2)
    sell_rate = models.DecimalField(max_digits=20, decimal_places=2)
    contract_address = models.CharField(max_length=255, blank=True)
    bank_details = models.TextField(blank=True)

    def __str__(self):
        return f"{self.asset} rates for {self.vendor}"

    class Meta:
        unique_together = ("vendor", "asset")