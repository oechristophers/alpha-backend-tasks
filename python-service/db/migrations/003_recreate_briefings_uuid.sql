-- Recreate briefing tables using UUID primary keys and composite child keys

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS briefing_metrics;
DROP TABLE IF EXISTS briefing_risks;
DROP TABLE IF EXISTS briefing_key_points;
DROP TABLE IF EXISTS briefings;

CREATE TABLE IF NOT EXISTS briefings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  briefing_id UUID NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
  position SMALLINT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (briefing_id, position)
);
CREATE INDEX IF NOT EXISTS idx_briefing_key_points_briefing_id ON briefing_key_points (briefing_id);

CREATE TABLE IF NOT EXISTS briefing_risks (
  briefing_id UUID NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
  position SMALLINT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (briefing_id, position)
);
CREATE INDEX IF NOT EXISTS idx_briefing_risks_briefing_id ON briefing_risks (briefing_id);

CREATE TABLE IF NOT EXISTS briefing_metrics (
  briefing_id UUID NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
  position SMALLINT NOT NULL,
  name VARCHAR(120) NOT NULL,
  value VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (briefing_id, position),
  UNIQUE (briefing_id, name)
);
CREATE INDEX IF NOT EXISTS idx_briefing_metrics_briefing_id ON briefing_metrics (briefing_id);
