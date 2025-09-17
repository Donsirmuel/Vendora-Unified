import pytest


def test_sse_requires_auth(client):
    resp = client.get('/api/v1/stream/?token=bad')
    # invalid token should yield 401 or 403
    assert resp.status_code in (401, 403)


@pytest.mark.django_db
def test_sse_with_valid_token(auth_client, vendor_user):
    # Generate JWT access token directly for vendor_user
    from rest_framework_simplejwt.tokens import AccessToken
    token = str(AccessToken.for_user(vendor_user))
    resp = auth_client.get(f'/api/v1/stream/?token={token}', stream=True)
    # StreamingHttpResponse may not finalize immediately; status should be 200
    assert resp.status_code == 200
    ctype = resp.get('Content-Type', '')
    assert 'text/event-stream' in ctype