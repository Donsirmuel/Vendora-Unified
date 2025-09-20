from django.test import TestCase, RequestFactory
from rest_framework.test import APIClient
from django.urls import reverse
from django.conf import settings
from io import BytesIO
import tempfile
import shutil
from django.contrib.messages.storage.fallback import FallbackStorage

from accounts.models import Vendor, PaymentRequest
from django import contrib
from accounts import admin as accounts_admin
from django.core import mail
from django.test import override_settings


class PaymentRequestTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # create a temporary media root for uploaded files during tests
        cls._tmp_media = tempfile.mkdtemp(prefix="test_media_")
        cls._orig_media = settings.MEDIA_ROOT
        settings.MEDIA_ROOT = cls._tmp_media

    @classmethod
    def tearDownClass(cls):
        # restore and remove temp media
        settings.MEDIA_ROOT = cls._orig_media
        try:
            shutil.rmtree(cls._tmp_media)
        except Exception:
            pass
        super().tearDownClass()

    def setUp(self):
        # create a vendor (regular user) and a staff/admin user
        self.vendor = Vendor.objects.create(email='vendor@example.com', password='pass', name='Vendor')
        # create a staff user -- Vendor is the user model in this project
        self.staff = Vendor.objects.create(email='admin@example.com', password='admin', name='Admin', is_staff=True, is_superuser=True)

        self.client = APIClient()
        self.client.force_authenticate(user=self.vendor)

        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.staff)

        self.factory = RequestFactory()

    def test_vendor_can_create_payment_request(self):
        url = reverse('accounts:payment_request-list')
        f = BytesIO(b'fake-bytes')
        f.name = 'receipt.png'
        resp = self.client.post(url, {'receipt': f, 'note': 'paid via bank'}, format='multipart')
        self.assertIn(resp.status_code, (200, 201))
        pr = PaymentRequest.objects.filter(vendor=self.vendor).first()
        self.assertIsNotNone(pr, "PaymentRequest was not created for vendor")
        self.assertEqual(pr.status, 'pending')
        self.assertIsNotNone(pr.created_at)
        self.assertTrue(bool(pr.receipt.name))

    def test_vendor_lists_only_their_requests(self):
        other = Vendor.objects.create(email='other@example.com', password='pass', name='Other')
        pr1 = PaymentRequest.objects.create(vendor=self.vendor, status='pending')
        pr2 = PaymentRequest.objects.create(vendor=other, status='pending')
        url = reverse('accounts:payment_request-list')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        # support paginated and non-paginated responses
        if isinstance(data, dict) and 'results' in data:
            items = data['results']
        else:
            items = data
        ids = {d['id'] for d in items}
        self.assertIn(pr1.id, ids)
        self.assertNotIn(pr2.id, ids)

    def test_staff_can_approve_via_admin_action(self):
        pr = PaymentRequest.objects.create(vendor=self.vendor, status='pending')
        # Build a fake request with a staff user so admin action records processed_by
        request = self.factory.post('/')
        request.user = self.staff
        # attach a session and messages storage so admin.message_user works
        setattr(request, 'session', {})
        messages = FallbackStorage(request)
        setattr(request, '_messages', messages)

        admin_instance = accounts_admin.PaymentRequestAdmin(PaymentRequest, contrib.admin.site)
        admin_instance.approve_payments(request, PaymentRequest.objects.filter(pk=pr.pk))

        pr.refresh_from_db()
        self.vendor.refresh_from_db()
        self.assertEqual(pr.status, 'approved')
        self.assertIsNotNone(pr.processed_at)
        self.assertIsNotNone(pr.processed_by)
        self.assertTrue(self.vendor.is_service_active)

    def test_unauthenticated_cannot_create(self):
        # logout and attempt create
        self.client.force_authenticate(user=None)
        url = reverse('accounts:payment_request-list')
        f = BytesIO(b'fake-bytes')
        f.name = 'receipt.png'
        resp = self.client.post(url, {'receipt': f, 'note': 'paid via bank'}, format='multipart')
        self.assertIn(resp.status_code, (401, 403))

    def test_create_cannot_set_status(self):
        # Attempt to set status on creation (should be ignored / read-only)
        url = reverse('accounts:payment_request-list')
        f = BytesIO(b'fake-bytes')
        f.name = 'receipt.png'
        resp = self.client.post(url, {'receipt': f, 'note': 'paid', 'status': 'approved'}, format='multipart')
        self.assertIn(resp.status_code, (200,201))
        pr = PaymentRequest.objects.get(vendor=self.vendor)
        self.assertNotEqual(pr.status, 'approved')

    def test_repeated_admin_approval_is_idempotent(self):
        pr = PaymentRequest.objects.create(vendor=self.vendor, status='pending')
        request = self.factory.post('/')
        request.user = self.staff
        from django.contrib.messages.storage.fallback import FallbackStorage
        setattr(request, 'session', {})
        setattr(request, '_messages', FallbackStorage(request))
        admin_instance = accounts_admin.PaymentRequestAdmin(PaymentRequest, contrib.admin.site)
        # approve twice
        admin_instance.approve_payments(request, PaymentRequest.objects.filter(pk=pr.pk))
        admin_instance.approve_payments(request, PaymentRequest.objects.filter(pk=pr.pk))
        pr.refresh_from_db()
        self.assertEqual(pr.status, 'approved')

    def test_admin_api_approve_and_reject_endpoints(self):
        pr = PaymentRequest.objects.create(vendor=self.vendor, status='pending')
        url_approve = reverse('accounts:payment_request-approve', kwargs={'pk': pr.pk})
        url_reject = reverse('accounts:payment_request-reject', kwargs={'pk': pr.pk})

        # Non-admin should get 403
        resp = self.client.post(url_approve)
        self.assertIn(resp.status_code, (403, 401))

        # Admin approves
        resp = self.admin_client.post(url_approve)
        self.assertEqual(resp.status_code, 200)
        pr.refresh_from_db()
        self.assertEqual(pr.status, 'approved')

        # Admin rejects (should be idempotent but now already approved)
        resp = self.admin_client.post(url_reject)
        self.assertEqual(resp.status_code, 200)
        pr.refresh_from_db()
        # after reject, status should be 'rejected'
        self.assertEqual(pr.status, 'rejected')

    @override_settings(ADMIN_EMAIL='owner@example.com', DEFAULT_FROM_EMAIL='noreply@example.com')
    def test_notification_sent_on_create(self):
        # clear outbox
        mail.outbox = []
        PaymentRequest.objects.create(vendor=self.vendor, status='pending', note='payment')
        # one email should be queued
        self.assertGreaterEqual(len(mail.outbox), 1)
