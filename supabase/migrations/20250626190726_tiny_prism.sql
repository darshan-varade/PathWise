/*
  # Fix RLS policies to prevent infinite recursion

  1. Policy Updates
    - Remove all existing policies that cause infinite recursion
    - Create simple policies that don't reference the profiles table recursively
    - Use direct auth.uid() checks for user policies
    - Use email-based checks for admin policies

  2. Security
    - Maintain proper access controls
    - Ensure users can only access their own data
    - Allow admin access based on email without table lookups
*/

-- Drop all existing policies on profiles table to start fresh
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Create simple, non-recursive policies for regular users
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Admin policies using auth.email() function instead of JWT parsing
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.email() = 'vampire@pathwise.com');

CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (auth.email() = 'vampire@pathwise.com');

-- Also fix other tables that had similar recursive issues
DROP POLICY IF EXISTS "Admins can read all roadmaps" ON roadmaps;
DROP POLICY IF EXISTS "Admins can read all progress" ON user_progress;
DROP POLICY IF EXISTS "Admins can read all completions" ON lesson_completions;

CREATE POLICY "Admins can read all roadmaps"
  ON roadmaps
  FOR SELECT
  TO authenticated
  USING (auth.email() = 'vampire@pathwise.com');

CREATE POLICY "Admins can read all progress"
  ON user_progress
  FOR SELECT
  TO authenticated
  USING (auth.email() = 'vampire@pathwise.com');

CREATE POLICY "Admins can read all completions"
  ON lesson_completions
  FOR SELECT
  TO authenticated
  USING (auth.email() = 'vampire@pathwise.com');