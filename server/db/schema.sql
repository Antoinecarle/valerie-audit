-- Valerie Audit Platform Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address TEXT NOT NULL,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'France',
  status TEXT NOT NULL DEFAULT 'draft', -- draft | generating | done | error
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL, -- localisation | enseignement | concurrence | court_sejour
  status TEXT NOT NULL DEFAULT 'pending', -- pending | generating | done | error
  content JSONB,
  raw_ai_response TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_sections_audit_id ON audit_sections(audit_id);
CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);

-- Add geocoordinates (safe to run multiple times)
ALTER TABLE audits ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
