from django.db import models
from orders.models import Order

# Create your models here.
class Transaction(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    proof = models.FileField(upload_to="proofs/")
    status = models.CharField(
        max_length=20,
        choices=[
            ("uncompleted", "Uncompleted"),
            ("completed", "Completed"),
            ("declined", "Declined"),
        ],
        default="uncompleted",
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    customer_receiving_details = models.TextField(blank=True)
    customer_note = models.TextField(blank=True)
    # Vendor completion artifacts
    vendor_proof = models.FileField(upload_to="vendor_proofs/", null=True, blank=True)
    vendor_completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-completed_at", "-id"]

    def __str__(self):
        return f"Transaction for Order {self.order}"