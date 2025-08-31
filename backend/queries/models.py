from django.db import models
from orders.models import Order
from django.utils import timezone
# Create your models here.

class Query(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    message = models.TextField()
    reply = models.TextField(blank=True)
    timestamp = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Query on Order #{self.order}"