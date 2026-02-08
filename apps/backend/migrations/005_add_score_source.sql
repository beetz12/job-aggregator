-- =============================================================================
-- Migration 005: Add score_source, match_score, and scored_at columns to jobs
-- =============================================================================
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- Add score_source column to track whether scoring was keyword or gemini
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS score_source VARCHAR(20);

-- Add match_score column to store the computed match score (0-100)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS match_score INTEGER;

-- Add scored_at timestamp
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ;

-- Add index for efficient querying of scored jobs
CREATE INDEX IF NOT EXISTS idx_jobs_match_score ON jobs (match_score DESC) WHERE match_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_score_source ON jobs (score_source) WHERE score_source IS NOT NULL;
