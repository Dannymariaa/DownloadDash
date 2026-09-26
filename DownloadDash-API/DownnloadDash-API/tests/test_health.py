from fastapi.testclient import TestClient

from app.main import app


def test_health_is_lightweight_and_does_not_probe_optional_bridges(monkeypatch):
    async def fail_bridge_probe():
        raise AssertionError("health should not probe optional bridge services")

    monkeypatch.setattr("app.main.whatsapp_downloader.get_connection_status", fail_bridge_probe)
    monkeypatch.setattr("app.main.whatsapp_business_downloader.get_connection_status", fail_bridge_probe)

    response = TestClient(app).get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["services"]["whatsapp"] == "not_checked"
    assert body["services"]["whatsapp_business"] == "not_checked"
