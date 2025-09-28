from django.test import TestCase
from django.utils import timezone
from accounts.models import Vendor

class VendorLimitsTest(TestCase):
    def test_can_accept_and_increment_resets_daily(self):
        v = Vendor.objects.create_user(email='vtest@example.com', password='pw', name='V Test')
        v.is_trial = False
        v.plan = 'none'
        v.daily_orders_count = 9
        v.daily_orders_date = timezone.now().date()
        v.save()

        can_accept, msg = v.can_accept_order()
        self.assertTrue(can_accept)
        v.increment_daily_orders()
        v.refresh_from_db()
        self.assertEqual(v.daily_orders_count, 10)

        # Next check should be disallowed
        can_accept2, msg2 = v.can_accept_order()
        self.assertFalse(can_accept2)
        self.assertIn("can't take any more orders", msg2)

    def test_reset_on_new_day(self):
        v = Vendor.objects.create_user(email='vtest2@example.com', password='pw', name='V Test2')
        v.is_trial = False
        v.plan = 'none'
        # Simulate yesterday
        v.daily_orders_count = 10
        v.daily_orders_date = (timezone.now() - timezone.timedelta(days=1)).date()
        v.save()

        can_accept, _ = v.can_accept_order()
        self.assertTrue(can_accept)
        # After can_accept a reset should have occurred
        v.refresh_from_db()
        self.assertEqual(v.daily_orders_count, 0)
