from django.test import TestCase
from rest_framework.test import APIClient
from django.urls import reverse
from accounts.models import Vendor
from orders.models import Order
from .models import Transaction
from io import BytesIO


class TransactionFlowTests(TestCase):
	def setUp(self):
		# Create vendor and a minimal order (rate required by model save)
		self.vendor = Vendor.objects.create(email='v@example.com', password='pass', name='Vendor')
		# Create order with required fields
		self.order = Order.objects.create(vendor=self.vendor, asset='BTC', type='buy', amount=100, rate=50000)
		self.transaction = Transaction.objects.create(order=self.order)
		# Authenticate as vendor using APIClient
		self.client = APIClient()
		self.client.force_authenticate(user=self.vendor)

	def test_proof_upload_does_not_complete(self):
		url = reverse('transactions:transaction-complete', kwargs={'pk': self.transaction.id})
		# Upload a dummy file via the complete endpoint
		f = BytesIO(b'data')
		f.name = 'proof.png'
		resp = self.client.post(url, {'proof': f}, format='multipart')
		self.assertEqual(resp.status_code, 200)
		self.transaction.refresh_from_db()
		self.assertEqual(self.transaction.status, 'uncompleted')
		self.assertIsNotNone(self.transaction.proof_uploaded_at)

	def test_mark_completed_sets_status_and_timestamps(self):
		url = reverse('transactions:transaction-mark-completed', kwargs={'pk': self.transaction.id})
		resp = self.client.post(url)
		self.assertEqual(resp.status_code, 200)
		self.transaction.refresh_from_db()
		self.assertEqual(self.transaction.status, 'completed')
		self.assertIsNotNone(self.transaction.completed_at)
		self.assertIsNotNone(self.transaction.vendor_completed_at)
