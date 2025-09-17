import pytest
from django.utils import timezone
from django.urls import reverse
from rest_framework.test import APIClient
from accounts.models import Vendor, NotificationLog

@pytest.mark.django_db
def test_expired_trial_gated(django_user_model):
    user = django_user_model.objects.create_user(email='t1@example.com', password='pass1234', name='T1')
    user.trial_expires_at = timezone.now() - timezone.timedelta(days=1)
    user.is_trial = True
    user.save(update_fields=['trial_expires_at','is_trial'])
    client = APIClient()
    from rest_framework_simplejwt.tokens import RefreshToken
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
    url = reverse('rates:rate-list')
    res = client.get(url)
    assert res.status_code == 403
    assert res.data.get('trial_expired') is True

@pytest.mark.django_db
def test_active_trial_allows_access(django_user_model):
    user = django_user_model.objects.create_user(email='t2@example.com', password='pass1234', name='T2')
    user.trial_expires_at = timezone.now() + timezone.timedelta(days=5)
    user.is_trial = True
    user.save(update_fields=['trial_expires_at','is_trial'])
    client = APIClient()
    from rest_framework_simplejwt.tokens import RefreshToken
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
    url = reverse('rates:rate-list')
    res = client.get(url)
    assert res.status_code == 200

@pytest.mark.django_db
def test_send_account_notices_management_command(django_user_model):
    # Create vendor with soon expiry and expired trial
    soon_user = django_user_model.objects.create_user(email='soon@example.com', password='pass1234', name='Soon')
    soon_user.trial_expires_at = timezone.now() + timezone.timedelta(days=2)
    soon_user.is_trial = True
    soon_user.save(update_fields=['trial_expires_at','is_trial'])
    expired_user = django_user_model.objects.create_user(email='expired@example.com', password='pass1234', name='Exp')
    expired_user.trial_expires_at = timezone.now() - timezone.timedelta(days=1)
    expired_user.is_trial = True
    expired_user.save(update_fields=['trial_expires_at','is_trial'])
    from django.core.management import call_command
    call_command('send_account_notices')
    kinds = list(NotificationLog.objects.order_by('kind').values_list('kind', flat=True))
    assert 'trial_ending' in kinds
    assert 'trial_expired' in kinds