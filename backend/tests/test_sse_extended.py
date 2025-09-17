import pytest
from rest_framework_simplejwt.tokens import AccessToken


@pytest.mark.django_db
def test_sse_initial_snapshot_contains_keys(auth_client, vendor_user, client):
    token = str(AccessToken.for_user(vendor_user))
    # Use Django test client directly (streaming); fetch first chunk
    resp = client.get(f"/api/v1/stream/?token={token}")
    assert resp.status_code == 200
    if hasattr(resp, 'streaming_content'):
        it = iter(resp.streaming_content)
        first_chunk = next(it, b"")
        body = first_chunk
    else:
        body = resp.content
    text = body.decode('utf-8', errors='ignore')
    assert 'event: snapshot' in text
    assert 'orders_updated_at' in text
    assert 'transactions_updated_at' in text