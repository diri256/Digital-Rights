/* =============================================
   DIRI - Supabase Migration: Admin & Quiz System
   Run this in the Supabase SQL Editor.
   ============================================= */

-- 1. Add role column to existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin', 'policymaker'));

-- 2. Create quiz_questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INT NOT NULL CHECK (correct_answer >= 0 AND correct_answer <= 3),
  category TEXT NOT NULL CHECK (category IN ('lesson', 'current_issue', 'scenario', 'hidden_check')),
  topic TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create quiz_weeks table
CREATE TABLE IF NOT EXISTS quiz_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  question_ids UUID[] NOT NULL DEFAULT '{}',
  time_limit_minutes INT NOT NULL DEFAULT 15,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create quiz_attempts table (for Phase 2, but defining now for schema completeness)
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  week_id UUID REFERENCES quiz_weeks(id) ON DELETE CASCADE NOT NULL,
  score INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 0,
  time_spent_seconds INT NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_id)
);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_questions_category ON quiz_questions(category);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_active ON quiz_questions(is_active);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_created_by ON quiz_questions(created_by);
CREATE INDEX IF NOT EXISTS idx_quiz_weeks_published ON quiz_weeks(is_published);
CREATE INDEX IF NOT EXISTS idx_quiz_weeks_week_number ON quiz_weeks(week_number DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_week ON quiz_attempts(week_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_score ON quiz_attempts(score DESC);

-- 6. Enable Row Level Security
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for quiz_questions
DROP POLICY IF EXISTS "Anyone can read active questions" ON quiz_questions;
DROP POLICY IF EXISTS "Admins and policymakers can insert questions" ON quiz_questions;
DROP POLICY IF EXISTS "Admins and policymakers can update questions" ON quiz_questions;
DROP POLICY IF EXISTS "Admins and policymakers can delete questions" ON quiz_questions;
CREATE POLICY "Anyone can read active questions"
  ON quiz_questions FOR SELECT
  USING (is_active = true OR auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'policymaker')
  ));

CREATE POLICY "Admins and policymakers can insert questions"
  ON quiz_questions FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'policymaker')
  ));

CREATE POLICY "Admins and policymakers can update questions"
  ON quiz_questions FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'policymaker')
  ));

CREATE POLICY "Admins and policymakers can delete questions"
  ON quiz_questions FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'policymaker')
  ));

-- 8. RLS Policies for quiz_weeks
DROP POLICY IF EXISTS "Anyone can read published weeks" ON quiz_weeks;
DROP POLICY IF EXISTS "Admins and policymakers can manage weeks" ON quiz_weeks;
DROP POLICY IF EXISTS "Admins and policymakers can update weeks" ON quiz_weeks;
DROP POLICY IF EXISTS "Admins and policymakers can delete weeks" ON quiz_weeks;
CREATE POLICY "Anyone can read published weeks"
  ON quiz_weeks FOR SELECT
  USING (is_published = true OR auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'policymaker')
  ));

CREATE POLICY "Admins and policymakers can manage weeks"
  ON quiz_weeks FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'policymaker')
  ));

CREATE POLICY "Admins and policymakers can update weeks"
  ON quiz_weeks FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'policymaker')
  ));

CREATE POLICY "Admins and policymakers can delete weeks"
  ON quiz_weeks FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'policymaker')
  ));

-- 9. RLS Policies for quiz_attempts
DROP POLICY IF EXISTS "Users can read their own attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can insert their own attempts" ON quiz_attempts;
CREATE POLICY "Users can read their own attempts"
  ON quiz_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attempts"
  ON quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 10. Create a function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they already exist so migration is safe to re-run
DROP TRIGGER IF EXISTS set_quiz_questions_updated_at ON quiz_questions;
DROP TRIGGER IF EXISTS set_quiz_weeks_updated_at ON quiz_weeks;

CREATE TRIGGER set_quiz_questions_updated_at
  BEFORE UPDATE ON quiz_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_quiz_weeks_updated_at
  BEFORE UPDATE ON quiz_weeks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- DIRI Phase 2 — Quiz System Additions
-- =============================================

-- 1. Add email column to profiles (for admin display)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Trigger to auto-sync email from auth.users on signup
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_profile_email();

-- Backfill existing users' emails
UPDATE public.profiles SET email = au.email
FROM auth.users au
WHERE profiles.id = au.id AND profiles.email IS NULL;

-- 3. Prevent non-admins from changing the role column
CREATE OR REPLACE FUNCTION check_role_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT (
    public.user_has_role('admin')
  ) THEN
    RAISE EXCEPTION 'Only admins can change the role column';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3b. Helper for role-based access checks (more reliable than direct subqueries)
CREATE OR REPLACE FUNCTION public.user_has_role(target_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = target_role
  );
$$;

DROP TRIGGER IF EXISTS prevent_role_self_update ON profiles;
CREATE TRIGGER prevent_role_self_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION check_role_update();

-- 4. Enable RLS on profiles (was missing!)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to allow re-run
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.user_has_role('admin')
    OR public.user_has_role('policymaker')
  );

CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Add columns to quiz_attempts for resume support
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed'
  CHECK (status IN ('in_progress', 'completed'));

ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS current_index INT NOT NULL DEFAULT 0;

ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS elapsed_seconds INT NOT NULL DEFAULT 0;

ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- 6. Add UPDATE policy for quiz_attempts (missing!)
DROP POLICY IF EXISTS "Users can update their own attempts" ON quiz_attempts;
CREATE POLICY "Users can update their own attempts"
  ON quiz_attempts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Create access_requests table
CREATE TABLE IF NOT EXISTS access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  requested_role TEXT NOT NULL DEFAULT 'admin' CHECK (requested_role = 'admin'),
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ar_insert" ON access_requests;
DROP POLICY IF EXISTS "ar_select" ON access_requests;
DROP POLICY IF EXISTS "ar_update" ON access_requests;

CREATE POLICY "ar_insert" ON access_requests FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (public.user_has_role('admin') OR public.user_has_role('policymaker'))
  );

CREATE POLICY "ar_select" ON access_requests FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.user_has_role('admin')
  );

CREATE POLICY "ar_update" ON access_requests FOR UPDATE
  USING (public.user_has_role('admin'));
