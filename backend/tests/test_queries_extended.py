from django.urls import reverse
from typing import Any, cast


def test_queries_scoped_to_vendor(auth_client, vendor_user, django_user_model):
    other = django_user_model.objects.create_user(email="otherx@example.com", password="pass1234", name="OtherX")
    from queries.models import Query
    # Query for other vendor
    cast(Any, Query).objects.create(vendor=other, message="Not yours", status="pending")
    # Query for current vendor
    mine = cast(Any, Query).objects.create(vendor=vendor_user, message="Yours", status="pending")
    url = reverse("queries:query-list")
    res = auth_client.get(url)
    assert res.status_code == 200
    data = res.json()  # PATCHED
    ids = [r["id"] for r in data["results"]]
    assert mine.id in ids and len(ids) == 1