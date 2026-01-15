-- =============================================================================
-- Migration 004: Add missing job sources (yc_jobs, themuse, jobicy_api)
-- =============================================================================
-- Run this in your Supabase SQL Editor to add the new sources
-- https://supabase.com/dashboard/project/_/sql
-- =============================================================================

-- Step 1: Update jobs table source constraint to include all 16 sources
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_source_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_source_check
  CHECK (source IN (
    'arbeitnow', 'hackernews', 'reddit', 'remotive', 'wellfound',
    'googlejobs', 'jobicy', 'weworkremotely', 'remoteok',
    'braintrust', 'devitjobs', 'dice', 'builtin',
    'yc_jobs', 'themuse', 'jobicy_api'
  ));

-- Step 2: Update sources table constraint
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_name_check;
ALTER TABLE sources ADD CONSTRAINT sources_name_check
  CHECK (name IN (
    'arbeitnow', 'hackernews', 'reddit', 'remotive', 'wellfound',
    'googlejobs', 'jobicy', 'weworkremotely', 'remoteok',
    'braintrust', 'devitjobs', 'dice', 'builtin',
    'yc_jobs', 'themuse', 'jobicy_api'
  ));

-- Step 3: Insert new sources (if they don't exist)
INSERT INTO sources (name, status) VALUES
  ('yc_jobs', 'unknown'),
  ('themuse', 'unknown'),
  ('jobicy_api', 'unknown')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- Verification queries
-- =============================================================================
-- Check constraints:
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'jobs'::regclass;
-- SELECT * FROM sources;
