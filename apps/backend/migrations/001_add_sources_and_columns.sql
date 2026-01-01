-- =============================================================================
-- Migration 001: Add new job sources and extended columns
-- =============================================================================
-- Run this in your Supabase SQL Editor to migrate existing databases
-- https://supabase.com/dashboard/project/_/sql
-- =============================================================================

-- Step 1: Update jobs table source constraint to include all 12 sources
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_source_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_source_check
  CHECK (source IN (
    'arbeitnow', 'hackernews', 'reddit', 'remotive', 'wellfound',
    'googlejobs', 'jobicy', 'weworkremotely', 'remoteok',
    'braintrust', 'devitjobs', 'github'
  ));

-- Step 2: Add extended fields for Python scraper integration
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_url TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location_parsed JSONB;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary JSONB;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employment_type TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_level TEXT;

-- Step 3: Add constraints for new enum-like columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_employment_type_check'
  ) THEN
    ALTER TABLE jobs ADD CONSTRAINT jobs_employment_type_check
      CHECK (employment_type IS NULL OR employment_type IN ('full-time', 'part-time', 'contract', 'internship'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_experience_level_check'
  ) THEN
    ALTER TABLE jobs ADD CONSTRAINT jobs_experience_level_check
      CHECK (experience_level IS NULL OR experience_level IN ('entry', 'mid', 'senior', 'lead', 'executive'));
  END IF;
END $$;

-- Step 4: Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_jobs_source_id ON jobs(source_id);
CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON jobs(employment_type);
CREATE INDEX IF NOT EXISTS idx_jobs_experience_level ON jobs(experience_level);
CREATE INDEX IF NOT EXISTS idx_jobs_location_parsed ON jobs USING GIN (location_parsed);

-- Step 5: Update sources table constraint
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_name_check;
ALTER TABLE sources ADD CONSTRAINT sources_name_check
  CHECK (name IN (
    'arbeitnow', 'hackernews', 'reddit', 'remotive', 'wellfound',
    'googlejobs', 'jobicy', 'weworkremotely', 'remoteok',
    'braintrust', 'devitjobs', 'github'
  ));

-- Step 6: Insert new sources (if they don't exist)
INSERT INTO sources (name, status) VALUES
  ('wellfound', 'unknown'),
  ('googlejobs', 'unknown'),
  ('jobicy', 'unknown'),
  ('weworkremotely', 'unknown'),
  ('remoteok', 'unknown'),
  ('braintrust', 'unknown'),
  ('devitjobs', 'unknown'),
  ('github', 'unknown')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- Verification queries
-- =============================================================================
-- Check jobs table columns:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'jobs';

-- Check sources:
-- SELECT * FROM sources;

-- Check constraints:
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'jobs'::regclass;
