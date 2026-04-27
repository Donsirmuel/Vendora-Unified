from rest_framework.test import APIClient
from django.urls import reverse
from typing import Any, cast
import json

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
    data = json.loads(res.content)
    access = data.get("access")
    refresh = data.get("refresh")
    assert access and refresh

    # Refresh token
    url = reverse("accounts:token_refresh")
    res = client.post(url, {"refresh": refresh}, format="json")
    assert int(cast(Any, res).status_code) == 200
    assert int(cast(Any, res).status_code) == 200
    assert "access" in res.json()


def test_jwt_refresh_cookie_and_logout(db):
    client = APIClient()
    from django.contrib.auth import get_user_model

    User = get_user_model()
    User.objects.create_user(email="cookie@example.com", password="pass1234", name="Cookie Tester")

    obtain_url = reverse("accounts:token_obtain_pair")
    res = client.post(obtain_url, {"email": "cookie@example.com", "password": "pass1234"}, format="json")
    assert int(cast(Any, res).status_code) in (200, 201)
    assert "access" in res.json()
    assert res.cookies.get("vendora_refresh_token") is not None

    refresh_url = reverse("accounts:token_refresh")
    client.cookies["vendora_refresh_token"] = res.cookies["vendora_refresh_token"].value
    res2 = client.post(refresh_url, {}, format="json")
    assert int(cast(Any, res2).status_code) == 200
    assert "access" in res2.json()

    logout_url = reverse("accounts:token_logout")
    res3 = client.post(logout_url, {}, format="json")
    assert int(cast(Any, res3).status_code) == 200
    assert res3.cookies.get("vendora_refresh_token") is not None
    assert res3.cookies.get("vendora_refresh_token").value == ""


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


