from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_catalog_is_explicitly_empty_placeholder() -> None:
    response = client.get("/api/catalog")

    assert response.status_code == 200
    assert response.json() == {
        "status": "placeholder",
        "satellites": [],
        "source": "not_configured",
        "message": "Satellite catalogue is not populated yet.",
    }
