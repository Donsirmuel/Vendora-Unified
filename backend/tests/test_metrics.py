import pytest
from django.urls import reverse

@pytest.mark.django_db
def test_metrics_basic(client, settings):
    settings.METRICS_SECRET = 'test-secret'
    url = reverse('metrics')
    # Unauthorized without token
    r = client.get(url)
    assert r.status_code == 403
    r2 = client.get(url, HTTP_X_METRICS_TOKEN='test-secret')
    assert r2.status_code == 200
    data = r2.json()
    assert 'uptime_seconds' in data
    assert 'counts' in data
    assert 'vendors_total' in data
    assert 'counters' in data and 'throttle_429_total' in data['counters']
