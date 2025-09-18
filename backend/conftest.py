import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

@pytest.fixture(autouse=True)
def relax_throttles(settings):
    # Make throttles effectively no-op for general tests; specific throttle tests can override via settings fixture
    rates = dict(settings.REST_FRAMEWORK.get('DEFAULT_THROTTLE_RATES', {}))
    rates.update({
        'user': '10000/min',
        'user_trial': '10000/min',
        'anon': '10000/min',
        'rate_write': '10000/min',
        'order_write': '10000/min',
        'auth_burst': '10000/min',
    })
    settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = rates
    settings.THROTTLE_TRIAL_USER = '10000/min'
    settings.THROTTLE_USER = '10000/min'

@pytest.fixture()
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture()
def vendor_user(db):
    User = get_user_model()
    return User.objects.create_user(username="vendorone", email="vendor@example.com", password="pass1234", name="Vendor One")


@pytest.fixture()
def auth_client(api_client: APIClient, vendor_user):
    api_client.force_authenticate(user=vendor_user)
    return api_client


