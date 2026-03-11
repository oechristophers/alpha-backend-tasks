# InsightOps Python Service - Briefing Generator

FastAPI service for capturing structured company briefings, validating input, persisting data, and rendering professional HTML reports with Jinja2 templates.

## Features

- Create and retrieve briefings with key points, risks, and metrics
- Validation rules enforce required fields, minimum list sizes, uppercase tickers, and unique metric names
- Server-side HTML report generation via `/briefings/{id}/generate` and retrieval via `/briefings/{id}/html`
- Manual SQL migrations with idempotent up/down support
- Example `sample-items` feature and health endpoint retained from the starter

## Prerequisites

- Python 3.12
- PostgreSQL (start from repository root):

```bash
docker compose up -d postgres
```

## Setup

```bash
cd python-service
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

`DATABASE_URL` defaults to the provided Docker compose Postgres instance. Adjust `.env` as needed.

## Run Migrations

```bash
cd python-service
source .venv/bin/activate
python -m app.db.run_migrations up
```

Roll back the latest migration:

```bash
python -m app.db.run_migrations down --steps 1
```

Migrations live in `db/migrations/` and are applied in filename order. A `schema_migrations` table tracks applied files.

## Run the Service

```bash
cd python-service
source .venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000
```

## API Quickstart

Create a briefing:

```bash
curl -X POST http://localhost:8000/briefings \
	-H "Content-Type: application/json" \
	-d '{
		"companyName": "Acme Holdings",
		"ticker": "acme",
		"sector": "Industrial Technology",
		"analystName": "Jane Doe",
		"summary": "Acme is benefiting from strong enterprise demand and improving operating leverage.",
		"recommendation": "Monitor for margin expansion before increasing exposure.",
		"keyPoints": [
			"Revenue grew 18% year-over-year.",
			"Management raised full-year guidance."
		],
		"risks": ["Top two customers account for 41% of revenue."],
		"metrics": [
			{"name": "Revenue Growth", "value": "18%"},
			{"name": "Operating Margin", "value": "22.4%"}
		]
	}'
```

Generate and fetch HTML:

```bash
BRIEFING_ID="<uuid-from-create-response>"
curl -X POST http://localhost:8000/briefings/$BRIEFING_ID/generate
curl http://localhost:8000/briefings/$BRIEFING_ID/html
```

Retrieve briefing data:

```bash
curl http://localhost:8000/briefings/$BRIEFING_ID
```

## Tests

```bash
cd python-service
source .venv/bin/activate
python -m pytest
```

## Project Layout

- `app/main.py`: FastAPI bootstrap and router wiring
- `app/api/`: route handlers (`briefings`, `sample-items`, `health`)
- `app/models/`: ORM models (briefings, related entities, sample items)
- `app/schemas/`: Pydantic request/response schemas with camelCase aliases
- `app/services/`: business logic and report formatting
- `app/templates/`: Jinja2 templates for HTML reports
- `app/db/`: SQLAlchemy session management and manual migration runner
- `db/migrations/`: SQL migration files
- `tests/`: pytest suite for endpoints
