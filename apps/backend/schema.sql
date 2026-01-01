-- =============================================================================
-- Job Aggregator - Supabase Schema
-- =============================================================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- JOBS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS jobs (
  -- Primary key (matches Motia job ID format: source_externalId)
  id TEXT PRIMARY KEY,

  -- Core job fields
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  remote BOOLEAN DEFAULT FALSE,
  url TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL CHECK (source IN (
    'arbeitnow', 'hackernews', 'reddit', 'remotive', 'wellfound',
    'googlejobs', 'jobicy', 'weworkremotely', 'remoteok',
    'braintrust', 'devitjobs', 'github'
  )),

  -- Extended fields from Python scraper integration
  source_id TEXT,                    -- Original ID from source
  company_url TEXT,                  -- Company website URL
  location_parsed JSONB,             -- Parsed location {city, state, country, countryCode}
  salary JSONB,                      -- Salary info {min, max, currency, period, normalizedYearly}
  employment_type TEXT CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'internship')),
  experience_level TEXT CHECK (experience_level IN ('entry', 'mid', 'senior', 'lead', 'executive')),
  posted_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}',
  health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),

  -- AI-enhanced fields
  ai_summary TEXT,
  skills TEXT[] DEFAULT '{}',

  -- Deduplication fields
  content_hash TEXT NOT NULL,
  title_normalized TEXT,
  company_normalized TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for deduplication (the magic!)
  CONSTRAINT unique_content_hash UNIQUE (content_hash)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_health_score ON jobs(health_score DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_content_hash ON jobs(content_hash);
CREATE INDEX IF NOT EXISTS idx_jobs_remote ON jobs(remote) WHERE remote = true;
CREATE INDEX IF NOT EXISTS idx_jobs_fetched_at ON jobs(fetched_at DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_jobs_search ON jobs USING GIN (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(company, '') || ' ' || coalesce(description, ''))
);

-- Indexes for extended fields
CREATE INDEX IF NOT EXISTS idx_jobs_source_id ON jobs(source_id);
CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON jobs(employment_type);
CREATE INDEX IF NOT EXISTS idx_jobs_experience_level ON jobs(experience_level);
CREATE INDEX IF NOT EXISTS idx_jobs_location_parsed ON jobs USING GIN (location_parsed);

-- Trigram indexes for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON jobs USING GIN (title_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_company_trgm ON jobs USING GIN (company_normalized gin_trgm_ops);

-- =============================================================================
-- SOURCES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL CHECK (name IN (
    'arbeitnow', 'hackernews', 'reddit', 'remotive', 'wellfound',
    'googlejobs', 'jobicy', 'weworkremotely', 'remoteok',
    'braintrust', 'devitjobs', 'github'
  )),
  status TEXT DEFAULT 'unknown' CHECK (status IN ('success', 'error', 'pending', 'unknown')),
  last_fetch TIMESTAMPTZ,
  job_count INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default sources
INSERT INTO sources (name, status) VALUES
  ('arbeitnow', 'unknown'),
  ('hackernews', 'unknown'),
  ('reddit', 'unknown'),
  ('remotive', 'unknown'),
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
-- PROFILES TABLE (for user profiles feature)
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  title TEXT,
  skills TEXT[] DEFAULT '{}',
  experience_years INTEGER,
  seniority_level TEXT CHECK (seniority_level IN ('junior', 'mid', 'senior', 'lead')),
  preferred_locations TEXT[] DEFAULT '{}',
  remote_preference TEXT CHECK (remote_preference IN ('remote-only', 'hybrid', 'onsite', 'flexible')),
  salary_min INTEGER,
  salary_max INTEGER,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_skills ON profiles USING GIN(skills);

-- =============================================================================
-- APPLICATIONS TABLE (for application tracking feature)
-- =============================================================================
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn')),
  applied_at TIMESTAMPTZ,
  notes TEXT,
  follow_up_date DATE,
  resume_version TEXT,
  cover_letter TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(job_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_profile ON applications(profile_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_follow_up ON applications(follow_up_date) WHERE follow_up_date IS NOT NULL;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS jobs_updated_at ON jobs;
CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS sources_updated_at ON sources;
CREATE TRIGGER sources_updated_at
  BEFORE UPDATE ON sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS applications_updated_at ON applications;
CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (Optional - enable if you want RLS)
-- =============================================================================
-- For now, we're using service_role key which bypasses RLS
-- Uncomment these if you want to enable RLS later

-- ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- VERIFICATION QUERIES (run to verify schema)
-- =============================================================================
-- Check tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check indexes:
-- SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public';

-- Check constraints:
-- SELECT conname, contype FROM pg_constraint WHERE connamespace = 'public'::regnamespace;
