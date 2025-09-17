import pytest
from django.utils import timezone
from datetime import timedelta


@pytest.mark.django_db
def test_signup_sets_trial_dates(client, settings):
    settings.TRIAL_DAYS = 7
    payload = {
        "email": "trialuser@example.com",
        "username": "trialuser",
        "password": "Str0ngPass!",
        "password_confirm": "Str0ngPass!",
    }
    resp = client.post("/api/v1/accounts/signup/", payload, content_type="application/json")
    assert resp.status_code == 201, resp.content
    data = resp.json()["user"]
    assert data["is_trial"] is True
    assert data["trial_expires_at"] is not None
    # Basic range check (>= now + 6 days, <= now + 8 days to allow timing slack)
    from datetime import datetime
    iso_val = data["trial_expires_at"].replace("Z", "+00:00")
    expires = datetime.fromisoformat(iso_val)
    if expires.tzinfo is None:
        expires = timezone.make_aware(expires)  # type: ignore[arg-type]
    now = timezone.now()
    assert expires >= now + timedelta(days=6)
    assert expires <= now + timedelta(days=8)