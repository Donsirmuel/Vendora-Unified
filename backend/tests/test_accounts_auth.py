from rest_framework.test import APIClient
from django.urls import reverse
from typing import Any, cast


def test_jwt_obtain_and_refresh(db):
    client = APIClient()
    # Create a user
    from django.contrib.auth import get_user_model

    User = get_user_model()
    User.objects.create_user(email="test@example.com", password="pass1234", name="Tester")

    # Obtain token
    url = reverse("accounts:token_obtain_pair")
    res = client.post(url, {"email": "test@example.com", "password": "pass1234"}, format="json")
    assert res.status_code in (200, 201)
    data = cast(Any, res).data
    access = data.get("access")
    refresh = data.get("refresh")
    assert access and refresh

    # Refresh token
    url = reverse("accounts:token_refresh")
    res = client.post(url, {"refresh": refresh}, format="json")
    assert int(cast(Any, res).status_code) == 200
    assert int(cast(Any, res).status_code) == 200
    assert "access" in cast(Any, res).data


def test_jwt_wrong_password(db):
    client = APIClient()
    from django.contrib.auth import get_user_model

    User = get_user_model()
    User.objects.create_user(email="bad@example.com", password="goodpass", name="Bad")

    url = reverse("accounts:token_obtain_pair")
    res = client.post(url, {"email": "bad@example.com", "password": "wrongpass"}, format="json")
    assert int(cast(Any, res).status_code) == 401


def test_vendors_requires_auth(db):
    client = APIClient()
    url = reverse("accounts:vendor-list")
    res = client.get(url)
    assert int(cast(Any, res).status_code) in (401, 403)


