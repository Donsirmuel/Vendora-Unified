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
    settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['user_trial'] = settings.THROTTLE_TRIAL_USER
    settings.DEBUG_PROPAGATE_EXCEPTIONS = True
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
        assert getattr(res, "status_code", None) in (200,201), res.content
    # 3rd should throttle
    res = auth_client.post(url, {
        'vendor': vendor_user.id,
        'asset': 'AST3',
        'buy_rate': '100.00',
        'sell_rate': '90.00'
    }, format='json')
    assert getattr(res, "status_code", None) == 429

@pytest.mark.django_db
def test_trial_vs_user_throttle_difference(settings, django_user_model):
    """Lower trial throttle should apply when user is_trial=True versus upgraded plan."""
    # Set distinct rates
    settings.THROTTLE_TRIAL_USER = '4/min'
    settings.THROTTLE_USER = '8/min'
    # Inject base user rate (will be superseded for trial via dynamic throttle)
    settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['user'] = settings.THROTTLE_USER
    # Isolate to only the two user-tier throttles
    settings.REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = [
        'vendora.throttling.TrialUserRateThrottle',
        'vendora.throttling.RegularUserRateThrottle'
    ]
    from django.core.cache import caches
    try:
        caches['default'].clear()
    except Exception:
        pass
    # Fresh trial user (avoid prior throttle counters)
    trial_user = django_user_model.objects.create_user(email='trialuser@example.com', password='pass1234', name='Trial User')
    client = APIClient()
    from rest_framework_simplejwt.tokens import RefreshToken
    token = RefreshToken.for_user(trial_user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(token.access_token)}')

    url = reverse('rates:rate-list')
    # For trial user with limit 4/min (THROTTLE_TRIAL_USER)
    for i in range(4):
        res = client.get(url, format='json')
        # debug: show iteration and status
        print('trial loop', i+1, getattr(res, "status_code", None))
        assert getattr(res, "status_code", None) == 200
    res = client.get(url)
    print('trial attempt 5 status', getattr(res, "status_code", None))
    assert getattr(res, "status_code", None) == 429  # 5th exceeds trial limit

    # Upgrade user (simulate plan change)
    trial_user.is_trial = False
    trial_user.plan = 'perpetual'
    trial_user.save(update_fields=['is_trial','plan'])
    from django.core.cache import caches
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
        print('paid loop', i+1, getattr(res, "status_code", None))
        assert getattr(res, "status_code", None) == 200
    res = upgraded_client.get(url)
    print('paid attempt 9 status', getattr(res, "status_code", None))
    assert getattr(res, "status_code", None) == 429

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
        assert getattr(r, "status_code", None) in (400,401)
    # 3rd attempt should be throttled (expect 429)
    r = client.post(url, {'email':'tb@example.com','password':'wrong'}, format='json')
    assert getattr(r, "status_code", None) == 429