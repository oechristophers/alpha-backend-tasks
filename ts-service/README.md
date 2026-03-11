# TalentFlow TypeScript Service

NestJS backend service implementing an asynchronous candidate document intake and summary generation workflow.

Recruiters upload candidate documents (resume, cover letter, etc.) and request structured summaries generated via an LLM provider using a queue/worker pattern.

## Prerequisites

- Node.js 22+
- npm
- PostgreSQL running from repository root:

```bash
docker compose up -d postgres
```

## Setup

```bash
cd ts-service
npm install
cp .env.example .env
```

## Environment Variables

| Variable                 | Description                              | Default                                                                   |
| ------------------------ | ---------------------------------------- | ------------------------------------------------------------------------- |
| `PORT`                   | Server port                              | `3000`                                                                    |
| `DATABASE_URL`           | PostgreSQL connection string             | `postgres://assessment_user:assessment_pass@localhost:5432/assessment_db` |
| `NODE_ENV`               | Environment                              | `development`                                                             |
| `GEMINI_API_KEY`         | Google Gemini API key                    | (empty)                                                                   |
| `GEMINI_MODEL`           | Gemini model to use                      | `gemini-1.5-flash`                                                        |
| `SUMMARY_PROMPT_VERSION` | Prompt version tag stored with summaries | `v1`                                                                      |
| `USE_FAKE_SUMMARIZER`    | Use fake provider instead of Gemini      | `true`                                                                    |

### Configuring the Gemini API Key

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Set it in `.env`:
   ```
   GEMINI_API_KEY=your-api-key-here
   USE_FAKE_SUMMARIZER=false
   ```

Do not commit API keys or secrets.

## Migrations

### Generate a new migration from entity changes

After modifying entities, generate a migration:

```bash
cd ts-service
npm run migration:generate -- migrations/YourMigrationName
```

### Run migrations

```bash
cd ts-service
npm run migration:run
```

### Preview pending migrations

```bash
npm run migration:show
```

### Revert the last migration

```bash
npm run migration:revert
```

## Run Service

```bash
cd ts-service
npm run start:dev
```

The API is available at `http://localhost:3000`. Swagger docs are at `http://localhost:3000/api`.

## Run Tests

```bash
cd ts-service
npm test
```

Tests use a mocked summarization provider and do not require a live LLM API or database connection.

## Authentication

All candidate endpoints require these headers:

| Header           | Description     | Example       |
| ---------------- | --------------- | ------------- |
| `x-user-id`      | User identifier | `user-1`      |
| `x-workspace-id` | Workspace scope | `workspace-1` |

## API Endpoints

### Documents

**Upload a document:**

```bash
curl -X POST http://localhost:3000/candidates/c-1/documents \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-1" \
  -H "x-workspace-id: workspace-1" \
  -d '{
    "documentType": "resume",
    "fileName": "john-doe-resume.pdf",
    "rawText": "John Doe - Senior Software Engineer with 8 years of experience..."
  }'
```

### Summaries

**Request summary generation:**

```bash
curl -X POST http://localhost:3000/candidates/c-1/summaries/generate \
  -H "x-user-id: user-1" \
  -H "x-workspace-id: workspace-1"
```

**List summaries for a candidate:**

```bash
curl http://localhost:3000/candidates/c-1/summaries \
  -H "x-user-id: user-1" \
  -H "x-workspace-id: workspace-1"
```

**Get a specific summary:**

```bash
curl http://localhost:3000/candidates/c-1/summaries/SUMMARY_ID \
  -H "x-user-id: user-1" \
  -H "x-workspace-id: workspace-1"
```

## Project Structure

```
src/
  auth/              Auth guard, decorator, types
  candidates/        Document + summary workflow
    dto/             Request validation DTOs
    candidates.controller.ts
    candidates.service.ts
    candidates.module.ts
    summary.worker.ts
  config/            TypeORM configuration
  entities/          TypeORM entities
  health/            Health check endpoint
  llm/               Summarization provider abstraction
    summarization-provider.interface.ts
    fake-summarization.provider.ts
    gemini-summarization.provider.ts
    llm.module.ts
  migrations/        Database migrations
  queue/             In-memory job queue
  sample/            Example workspace-scoped module
```
