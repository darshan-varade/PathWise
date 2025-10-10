/*
  # PathWise Learning Platform Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `avatar_url` (text)
      - `is_admin` (boolean, default false)
      - `goal` (text)
      - `preferences` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `roadmaps`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title` (text)
      - `goal` (text)
      - `weeks` (jsonb)
      - `questions` (jsonb)
      - `answers` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `lessons`
      - `id` (uuid, primary key)
      - `roadmap_id` (uuid, references roadmaps)
      - `week_number` (integer)
      - `title` (text)
      - `lesson_objective` (text)
      - `estimated_time` (text)
      - `content` (jsonb)
      - `order_index` (integer)
      - `created_at` (timestamp)

    - `user_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `roadmap_id` (uuid, references roadmaps)
      - `total_lessons` (integer, default 0)
      - `completed_lessons` (integer, default 0)
      - `total_time_spent` (integer, default 0)
      - `average_accuracy` (numeric, default 0)
      - `current_week` (integer, default 1)
      - `updated_at` (timestamp)

    - `lesson_completions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `lesson_id` (uuid, references lessons)
      - `score` (integer)
      - `time_spent` (integer)
      - `answers` (jsonb)
      - `completed_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add admin policies for user management

  3. Admin User Setup
    - Create admin user with predefined credentials
    - Set admin privileges for user management
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  is_admin boolean DEFAULT false,
  goal text,
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create roadmaps table
CREATE TABLE IF NOT EXISTS roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  goal text NOT NULL,
  weeks jsonb DEFAULT '[]',
  questions jsonb DEFAULT '{}',
  answers jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid REFERENCES roadmaps(id) ON DELETE CASCADE NOT NULL,
  week_number integer NOT NULL,
  title text NOT NULL,
  lesson_objective text NOT NULL,
  estimated_time text NOT NULL,
  content jsonb DEFAULT '{}',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create user_progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  roadmap_id uuid REFERENCES roadmaps(id) ON DELETE CASCADE NOT NULL,
  total_lessons integer DEFAULT 0,
  completed_lessons integer DEFAULT 0,
  total_time_spent integer DEFAULT 0,
  average_accuracy numeric DEFAULT 0,
  current_week integer DEFAULT 1,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, roadmap_id)
);

-- Create lesson_completions table
CREATE TABLE IF NOT EXISTS lesson_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE NOT NULL,
  score integer,
  time_spent integer,
  answers jsonb DEFAULT '{}',
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Roadmaps policies
CREATE POLICY "Users can manage own roadmaps"
  ON roadmaps
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all roadmaps"
  ON roadmaps
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Lessons policies
CREATE POLICY "Users can read lessons from own roadmaps"
  ON lessons
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roadmaps
      WHERE roadmaps.id = lessons.roadmap_id
      AND roadmaps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage lessons from own roadmaps"
  ON lessons
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roadmaps
      WHERE roadmaps.id = lessons.roadmap_id
      AND roadmaps.user_id = auth.uid()
    )
  );

-- User progress policies
CREATE POLICY "Users can manage own progress"
  ON user_progress
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all progress"
  ON user_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Lesson completions policies
CREATE POLICY "Users can manage own completions"
  ON lesson_completions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all completions"
  ON lesson_completions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create function to handle profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roadmaps_updated_at
  BEFORE UPDATE ON roadmaps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert admin user (will be created when they sign up)
-- The admin credentials are: email: vampire@pathwise.com, password: vampire
-- After signup, we'll update their profile to set is_admin = true