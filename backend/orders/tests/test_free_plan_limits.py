from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from accounts.models import Vendor
from orders.models import Order
from rest_framework.test import APIClient

class FreePlanLimitTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # create vendor
        self.vendor = Vendor.objects.create(email='vendor@example.com', password='testpass', name='Vendor One')
        # ensure vendor is on free plan
        self.vendor.is_trial = False
        self.vendor.plan = 'none'
        self.vendor.daily_orders_count = 0
        self.vendor.daily_orders_date = None
        self.vendor.save()
        # create a pending order for this vendor
        self.order = Order.objects.create(vendor=self.vendor, asset='BTC', type=Order.BUY, amount=1.0, rate=100.0, status=Order.PENDING)

    def test_can_accept_order_and_increment(self):
        # Initially should be allowed
        can_accept, msg = self.vendor.can_accept_order()
        self.assertTrue(can_accept)
        # increment
        self.vendor.increment_daily_orders()
        self.vendor.refresh_from_db()
        self.assertEqual(self.vendor.daily_orders_count, 1)

    def test_accept_endpoint_rejects_when_limit_reached(self):
        # set vendor to limit
        self.vendor.daily_orders_count = self.vendor.get_daily_order_limit()
        self.vendor.daily_orders_date = timezone.now().date()
        self.vendor.save()
        # authenticate as vendor using DRF test client
        self.client.force_authenticate(user=self.vendor)
        url = f"/api/v1/orders/{self.order.pk}/accept/"
        resp = self.client.post(url, {}, format='json')
        self.assertEqual(resp.status_code, 403)
        self.assertIn("can't take any more orders", resp.json().get('detail',''))
