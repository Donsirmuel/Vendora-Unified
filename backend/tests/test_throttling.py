import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle
from django.utils import timezone

class _KeyProbe(SimpleRateThrottle):
    scope = 'user'
    def get_cache_key(self, request, view):  # type: ignore[override]
        if request.user and request.user.is_authenticated:
            return self.cache_format % {'scope': self.scope, 'ident': f'user:{request.user.pk}'}
        return None

def _dump_counter(client, url):
    # Perform a HEAD (still counts) then inspect internal key
    req = client.get(url)  # request executed
    probe = _KeyProbe()
    # mimic DRF internal
    request = req.wsgi_request  # type: ignore[attr-defined]
    key = probe.get_cache_key(request, None)
    print('DEBUG key', key)
    return req

@pytest.mark.django_db
def test_rate_write_throttle(auth_client, vendor_user, settings):
    """Create more Rate objects than allowed to trigger throttle (rate_write)."""
    # Ensure a low limit for test determinism
    settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['rate_write'] = '2/min'
    # Inflate other rates so only rate_write matters
    settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['user'] = '999/min'
    settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['anon'] = '999/min'
    # Narrow throttle classes to those relevant
    settings.REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = [
        'vendora.throttling.RateWriteScopedThrottle'
    ]
    # Clear cache so previous tests don't pollute counts
    from django.core.cache import caches
    try:
        caches['default'].clear()
    except Exception:
        pass
    url = reverse('rates:rate-list')
    # Create 2 rates (should pass)
    for i, asset in enumerate(['AST1','AST2']):
        res = auth_client.post(url, {
            'vendor': vendor_user.id,
            'asset': asset,
            'buy_rate': '100.00',
            'sell_rate': '90.00'
        }, format='json')
        assert res.status_code in (200,201), res.content
    # 3rd should throttle
    res = auth_client.post(url, {
            @pytest.mark.django_db
            def test_trial_vs_user_throttle_difference(settings, django_user_model):
                """Trial users have lower per-minute read rate than upgraded users."""
                # Distinct small limits for fast test
                settings.THROTTLE_TRIAL_USER = '2/min'
                settings.THROTTLE_USER = '5/min'
                settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['user'] = settings.THROTTLE_USER
                settings.REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = [
                    'vendora.throttling.DynamicUserRateThrottle'
                ]
                from django.core.cache import caches
                try:
                    caches['default'].clear()
                except Exception:
                    pass
                # Create trial user
                trial_user = django_user_model.objects.create_user(email='trialdiff@example.com', password='pass1234', name='Trial Diff')
                assert trial_user.is_trial is True
                from rest_framework_simplejwt.tokens import RefreshToken
                client = APIClient()
                token = RefreshToken.for_user(trial_user)
                client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(token.access_token)}')
                url = reverse('rates:rate-list')
                # Allow 2 requests
                for _ in range(2):
                    assert client.get(url).status_code == 200
                # 3rd throttled
                assert client.get(url).status_code == 429
                # Upgrade
                trial_user.is_trial = False
                trial_user.plan = 'perpetual'
                trial_user.save(update_fields=['is_trial','plan'])
                try:
                    caches['default'].clear()
                except Exception:
                    pass
                upgraded_client = APIClient()
                upgraded_token = RefreshToken.for_user(trial_user)
                upgraded_client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(upgraded_token.access_token)}')
                # Allow 5 requests, 6th throttled
                for _ in range(5):
                    assert upgraded_client.get(url).status_code == 200
                assert upgraded_client.get(url).status_code == 429
    try:
        caches['default'].clear()
    except Exception:
        pass
    # New client with fresh auth token to avoid cached throttle key collision
    upgraded_client = APIClient()
    from rest_framework_simplejwt.tokens import RefreshToken as RT2
    upgraded_token = RT2.for_user(trial_user)
    upgraded_client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(upgraded_token.access_token)}')
    # With user rate 8/min we should allow 8 requests before throttle
    for i in range(8):
        res = upgraded_client.get(url)
        print('paid loop', i+1, res.status_code)
        assert res.status_code == 200
    res = upgraded_client.get(url)
    print('paid attempt 9 status', res.status_code)
    assert res.status_code == 429

@pytest.mark.django_db
def test_auth_burst_throttle(settings, django_user_model):
    settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['auth_burst'] = '2/min'
    settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['anon'] = '999/min'
    settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['user'] = '999/min'
    settings.REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = [
        'vendora.throttling.AuthBurstScopedThrottle'
    ]
    from django.core.cache import caches
    try:
        caches['default'].clear()
    except Exception:
        pass
    # Create a user
    user = django_user_model.objects.create_user(email='tb@example.com', password='Str0ngPass!', name='T')
    url = reverse('accounts:token_obtain_pair')
    from rest_framework.test import APIClient as DRFClient
    client = DRFClient()
    # First 3 attempts with wrong password
    for i in range(2):
        r = client.post(url, {'email':'tb@example.com','password':'wrong'}, format='json')
        assert r.status_code in (400,401)
    # 3rd attempt should be throttled (expect 429)
    r = client.post(url, {'email':'tb@example.com','password':'wrong'}, format='json')
    assert r.status_code == 429
