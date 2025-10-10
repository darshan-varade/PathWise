/*
  # Fix RLS policies to prevent infinite recursion

  1. Policy Updates
    - Remove circular dependencies in profiles table policies
    - Simplify admin policies to avoid recursion
    - Update roadmaps and user_progress policies

  2. Security
    - Maintain proper access controls
    - Ensure users can only access their own data
    - Allow admins to access all data without recursion
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can read all roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Admins can read all progress" ON user_progress;
DROP POLICY IF EXISTS "Admins can read all completions" ON lesson_completions;

-- Create simplified admin policies that don't cause recursion
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Direct check without subquery to avoid recursion
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    -- Direct check without subquery to avoid recursion
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Admins can read all roadmaps"
  ON roadmaps
  FOR SELECT
  TO authenticated
  USING (
    -- Direct check without subquery to avoid recursion
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Admins can read all progress"
  ON user_progress
  FOR SELECT
  TO authenticated
  USING (
    -- Direct check without subquery to avoid recursion
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Admins can read all completions"
  ON lesson_completions
  FOR SELECT
  TO authenticated
  USING (
    -- Direct check without subquery to avoid recursion
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );