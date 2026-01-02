-- =============================================================================
-- Migration 002: Add missing columns for TypeScript type consistency
-- =============================================================================
-- Run this in your Supabase SQL Editor to migrate existing databases
-- https://supabase.com/dashboard/project/_/sql
-- =============================================================================

-- Step 1: Add salary_currency to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salary_currency TEXT DEFAULT 'USD';

-- Step 2: Add job_title and company to applications table
-- These are denormalized for quick display without JOINs
ALTER TABLE applications ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS company TEXT;

-- Step 3: Backfill existing applications with job data
UPDATE applications a
SET
  job_title = COALESCE(a.job_title, j.title),
  company = COALESCE(a.company, j.company)
FROM jobs j
WHERE a.job_id = j.id
  AND (a.job_title IS NULL OR a.company IS NULL);

-- Step 4: Make columns NOT NULL after backfill (optional - uncomment if desired)
-- ALTER TABLE applications ALTER COLUMN job_title SET NOT NULL;
-- ALTER TABLE applications ALTER COLUMN company SET NOT NULL;

-- =============================================================================
-- Verification queries
-- =============================================================================
-- Check profiles columns:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles';

-- Check applications columns:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'applications';
