-- Roll back to integer-based briefing tables (matches prior migration 002)

DROP TABLE IF EXISTS briefing_metrics;
DROP TABLE IF EXISTS briefing_risks;
DROP TABLE IF EXISTS briefing_key_points;
DROP TABLE IF EXISTS briefings;

CREATE TABLE IF NOT EXISTS briefings (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(200) NOT NULL,
  ticker VARCHAR(16) NOT NULL,
  sector VARCHAR(120),
  analyst_name VARCHAR(120),
  summary TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  generated_html TEXT,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_briefings_ticker ON briefings (ticker);
CREATE INDEX IF NOT EXISTS idx_briefings_created_at ON briefings (created_at DESC);

CREATE TABLE IF NOT EXISTS briefing_key_points (
  id SERIAL PRIMARY KEY,
  briefing_id INTEGER NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  position SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (briefing_id, position)
);
CREATE INDEX IF NOT EXISTS idx_briefing_key_points_briefing_id ON briefing_key_points (briefing_id);

CREATE TABLE IF NOT EXISTS briefing_risks (
  id SERIAL PRIMARY KEY,
  briefing_id INTEGER NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  position SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (briefing_id, position)
);
CREATE INDEX IF NOT EXISTS idx_briefing_risks_briefing_id ON briefing_risks (briefing_id);

CREATE TABLE IF NOT EXISTS briefing_metrics (
  id SERIAL PRIMARY KEY,
  briefing_id INTEGER NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  value VARCHAR(120) NOT NULL,
  position SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (briefing_id, name),
  UNIQUE (briefing_id, position)
);
CREATE INDEX IF NOT EXISTS idx_briefing_metrics_briefing_id ON briefing_metrics (briefing_id);
