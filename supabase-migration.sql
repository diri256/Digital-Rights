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

CREATE TRIGGER set_quiz_questions_updated_at
  BEFORE UPDATE ON quiz_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_quiz_weeks_updated_at
  BEFORE UPDATE ON quiz_weeks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
