-- Migration: Add Resume and Submission Tracking
-- Date: 2026-01-02
-- Purpose: Add resume storage, custom resume generation, submission tracking, and checkpoint data to profiles and applications

-- ============================================================================
-- 1. PROFILES TABLE ADDITIONS
-- ============================================================================
-- Add resume storage and parsing fields to profiles

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_text TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_markdown TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_parsed_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_skills TEXT[] DEFAULT '{}';

-- ============================================================================
-- 2. APPLICATIONS TABLE ADDITIONS
-- ============================================================================
-- Add custom resume, cover letter, submission tracking, and checkpoint fields

ALTER TABLE applications ADD COLUMN IF NOT EXISTS custom_resume_markdown TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS custom_resume_generated_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS custom_cover_letter_markdown TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS submission_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS qa_responses JSONB DEFAULT '[]';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS checkpoint_status TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS checkpoint_data JSONB;

-- ============================================================================
-- 3. UPDATE STATUS CHECK CONSTRAINT
-- ============================================================================
-- Expand status enum to include new application workflow statuses

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications ADD CONSTRAINT applications_status_check CHECK (
  status IN (
    'saved',
    'analyzing',
    'analyzed',
    'generating',
    'resume_ready',
    'applying',
    'needs_input',
    'applied',
    'failed',
    'interview',
    'rejected',
    'offer',
    'withdrawn'
  )
);

-- ============================================================================
-- 4. PERFORMANCE INDEXES
-- ============================================================================
-- Add indexes for common query patterns

CREATE INDEX IF NOT EXISTS idx_applications_checkpoint
  ON applications(checkpoint_status)
  WHERE checkpoint_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_applications_custom_resume
  ON applications(custom_resume_generated_at)
  WHERE custom_resume_generated_at IS NOT NULL;

-- ============================================================================
-- NOTES
-- ============================================================================
-- - resume_url: Storage path for uploaded resume file
-- - resume_text: Plain text extraction from resume for parsing
-- - resume_markdown: Structured markdown representation of resume
-- - resume_parsed_at: Timestamp of last resume parsing
-- - resume_skills: Extracted skills array for matching
-- - custom_resume_markdown: Job-specific tailored resume
-- - custom_cover_letter_markdown: Job-specific cover letter
-- - qa_responses: JSON array of question/answer pairs for application forms
-- - checkpoint_status: Current checkpoint in multi-step application process
-- - checkpoint_data: State data for resuming interrupted applications
-- - submission_url: Final application submission confirmation URL
