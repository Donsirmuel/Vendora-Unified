import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.utils import timezone

@pytest.mark.django_db
def test_upgrade_from_trial_monthly(django_user_model, settings):
    user = django_user_model.objects.create_user(email='u1@example.com', password='pass1234', name='T1')
    # Ensure trial values
    user.is_trial = True
    user.plan = 'trial'
    user.save(update_fields=['is_trial','plan'])
    from rest_framework_simplejwt.tokens import RefreshToken
    token = RefreshToken.for_user(user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
    url = reverse('accounts:plan_upgrade')
    res = client.post(url, {'plan': 'monthly'}, format='json')
    assert res.status_code == 200, getattr(res, 'content', res)
    data = res.json()  # PATCHED
    assert data['subscription_status']['plan'] == 'monthly'
    assert data['subscription_status']['is_trial'] is False
    assert data['subscription_status']['plan_expires_at'] is not None

@pytest.mark.django_db
def test_upgrade_perpetual_sets_no_expiry(django_user_model):
    user = django_user_model.objects.create_user(email='u2@example.com', password='pass1234', name='T2')
    from rest_framework_simplejwt.tokens import RefreshToken
    token = RefreshToken.for_user(user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
    url = reverse('accounts:plan_upgrade')
    res = client.post(url, {'plan': 'perpetual'}, format='json')
    assert res.status_code == 200
    data = res.json()
    assert data['subscription_status']['plan'] == 'perpetual'
    assert data['subscription_status']['plan_expires_at'] is None

@pytest.mark.django_db
def test_upgrade_idempotent_same_plan(django_user_model):
    user = django_user_model.objects.create_user(email='u3@example.com', password='pass1234', name='T3')
    # First upgrade to monthly
    from rest_framework_simplejwt.tokens import RefreshToken
    token = RefreshToken.for_user(user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
    url = reverse('accounts:plan_upgrade')
    res1 = client.post(url, {'plan': 'monthly'}, format='json')
    assert res1.status_code == 200
    data1 = res1.json()  # PATCHED if you use data1 later
    # Second upgrade to same plan should not error
    res2 = client.post(url, {'plan': 'monthly'}, format='json')
    assert res2.status_code == 200
    data2 = res2.json()  # PATCHED if you use data2 later
