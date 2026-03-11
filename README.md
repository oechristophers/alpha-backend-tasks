# Backend Engineering Assessment Starter

This repository is a standalone starter for the backend engineering take-home assessment.
It contains two independent services in a shared mono-repo:

- `python-service/` (InsightOps): FastAPI + SQLAlchemy + manual SQL migrations
- `ts-service/` (TalentFlow): NestJS + TypeORM

## Prerequisites

- Docker
- Python 3.12
- Node.js 22+
- npm

## Quick Start

1. Start Postgres (once) from repo root:

```bash
docker compose up -d postgres
```

2. Python service (InsightOps):

```bash
cd python-service
python -m venv .venv
source .venv/Scripts/activate  # Windows PowerShell: .venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

3. TypeScript service (TalentFlow):

```bash
cd ts-service
npm install
cp .env.example .env
npm run migration:run
npm run start:dev
```

## Service Guides

- Python service setup and commands: [python-service/README.md](python-service/README.md)
- TypeScript service setup and commands: [ts-service/README.md](ts-service/README.md)

## Headers and Auth

The TypeScript service uses a fake auth guard. Include these on requests:

- `x-user-id`: any non-empty string (example: user-1)
- `x-workspace-id`: workspace identifier (example: workspace-1)

## Start Postgres

From the repository root:

```bash
docker compose up -d postgres
```

This starts PostgreSQL on `localhost:5432` with:

- database: `assessment_db`
- user: `assessment_user`
- password: `assessment_pass`

## Service Guides

- Python service setup and commands: [python-service/README.md](python-service/README.md)
- TypeScript service setup and commands: [ts-service/README.md](ts-service/README.md)
