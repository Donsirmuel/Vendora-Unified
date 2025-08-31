from django.db import models
from orders.models import Order

# Create your models here.
class Transaction(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    proof = models.FileField(upload_to="proofs/")
    status = models.CharField(max_length=20, choices=[("completed", "Completed"), ("declined", "Declined")])
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-completed_at", "-id"]

    def __str__(self):
        return f"Transaction for Order {self.order}"