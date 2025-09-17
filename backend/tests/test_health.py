def test_health_endpoint(client):
    resp = client.get('/health/')
    assert resp.status_code == 200
    data = resp.json()
    for key in ['status', 'db', 'time', 'host', 'version']:
        assert key in data
    assert data['status'] in ('ok', 'degraded')