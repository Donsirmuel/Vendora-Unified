from django.urls import reverse


def test_rate_negative_validation(auth_client, vendor_user):
    url = reverse("rates:rate-list")
    payload = {
        "asset": "DOGE",
        "buy_rate": "-1",
        "sell_rate": "0.01",
        "contract_address": "",
    }
    res = auth_client.post(url, payload, format="json")
    assert res.status_code == 400
    # API wraps field errors under 'errors'
    assert "errors" in res.data and "buy_rate" in res.data["errors"]

    payload["buy_rate"] = "1"
    payload["sell_rate"] = "0"
    res2 = auth_client.post(url, payload, format="json")
    assert res2.status_code == 400
    assert "errors" in res2.data and "sell_rate" in res2.data["errors"]


def test_rate_ordering_and_search(auth_client, vendor_user):
    url = reverse("rates:rate-list")
    assets = ["BTC", "ETH", "ADA"]
    for a in assets:
        res = auth_client.post(url, {"asset": a, "buy_rate": "10", "sell_rate": "9", "contract_address": ""}, format="json")
        assert res.status_code in (200, 201)

    # Default ordering by asset then id
    list_res = auth_client.get(url)
    names = [r["asset"] for r in list_res.data["results"]]
    assert names == sorted(names)

    # Search for ETH
    search_res = auth_client.get(url + "?search=ETH")
    assert len(search_res.data["results"]) == 1
    assert search_res.data["results"][0]["asset"] == "ETH"