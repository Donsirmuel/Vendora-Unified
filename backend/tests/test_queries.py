from django.urls import reverse


def test_queries_requires_auth(db):
    from rest_framework.test import APIClient

    client = APIClient()
    url = reverse("queries:query-list")
    res = client.get(url)
    assert int(getattr(res, "status_code", 0)) in (401, 403)
