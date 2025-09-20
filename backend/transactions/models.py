from django.db import models
from django.db.models import UniqueConstraint, Index
from django.utils import timezone
from orders.models import Order

# Create your models here.
class Transaction(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    proof = models.FileField(upload_to="proofs/", null=True, blank=True)
    # When the proof was first uploaded (customer or vendor)
    proof_uploaded_at = models.DateTimeField(null=True, blank=True)
    # Creation timestamp for the transaction record
    # Use a timezone-aware default so adding this field during migrations
    # does not require an interactive one-off default prompt.
    created_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(
        max_length=20,
        choices=[
            ("uncompleted", "Uncompleted"),
            ("completed", "Completed"),
            ("declined", "Declined"),
            ("expired", "Expired"),
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
        constraints = [
            UniqueConstraint(fields=["order"], name="unique_transaction_per_order"),
        ]
        indexes = [
            Index(fields=["status", "completed_at"], name="txn_sc_idx"),
        ]

    def __str__(self):
        return f"Transaction for Order {self.order}"