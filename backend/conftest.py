import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model


@pytest.fixture()
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture()
def vendor_user(db):
    User = get_user_model()
    return User.objects.create_user(email="vendor@example.com", password="pass1234", name="Vendor One")


@pytest.fixture()
def auth_client(api_client: APIClient, vendor_user):
    api_client.force_authenticate(user=vendor_user)
    return api_client


