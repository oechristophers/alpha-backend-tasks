from collections.abc import Generator
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Briefing, BriefingKeyPoint, BriefingMetric, BriefingRisk  # noqa: F401


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def _valid_payload() -> dict[str, object]:
    return {
        "companyName": "Acme Holdings",
        "ticker": "acme",
        "sector": "Industrial Technology",
        "analystName": "Jane Doe",
        "summary": "Acme is benefiting from strong enterprise demand and improving operating leverage.",
        "recommendation": "Monitor for margin expansion before increasing exposure.",
        "keyPoints": [
            "Revenue grew 18% year-over-year.",
            "Management raised full-year guidance.",
        ],
        "risks": ["Top two customers account for 41% of revenue."],
        "metrics": [
            {"name": "Revenue Growth", "value": "18%"},
            {"name": "Operating Margin", "value": "22.4%"},
        ],
    }


def test_create_briefing_success(client: TestClient) -> None:
    response = client.post("/briefings", json=_valid_payload())
    assert response.status_code == 201

    body = response.json()
    uuid.UUID(body["id"])  # validates UUID format
    assert body["ticker"] == "ACME"
    assert len(body["keyPoints"]) == 2
    assert len(body["metrics"]) == 2
    assert "id" not in body["keyPoints"][0]
    assert "id" not in body["metrics"][0]


def test_validation_rejects_insufficient_points(client: TestClient) -> None:
    payload = _valid_payload()
    payload["keyPoints"] = ["Only one point"]

    response = client.post("/briefings", json=payload)
    assert response.status_code == 422

    detail = response.json()["detail"]
    assert "At least two keyPoints" in detail[0]["msg"]


def test_generate_and_fetch_html(client: TestClient) -> None:
    create_resp = client.post("/briefings", json=_valid_payload())
    briefing_id = create_resp.json()["id"]

    generate_resp = client.post(f"/briefings/{briefing_id}/generate")
    assert generate_resp.status_code == 200
    gen_body = generate_resp.json()
    assert gen_body["generated"] is True
    assert "html" in gen_body and len(gen_body["html"]) > 0

    html_resp = client.get(f"/briefings/{briefing_id}/html")
    assert html_resp.status_code == 200
    assert "Acme Holdings" in html_resp.text
    assert "Key Points" in html_resp.text


def test_html_requires_generation(client: TestClient) -> None:
    create_resp = client.post("/briefings", json=_valid_payload())
    briefing_id = create_resp.json()["id"]

    html_resp = client.get(f"/briefings/{briefing_id}/html")
    assert html_resp.status_code == 409
    assert "not been generated" in html_resp.json()["detail"]
