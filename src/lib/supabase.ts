import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env file."
  );
}

// Add validation for URL format
if (
  !supabaseUrl.startsWith("https://") ||
  !supabaseUrl.includes(".supabase.co")
) {
  throw new Error(
    "Invalid Supabase URL format. Expected format: [https://your-project.supabase.co](https://your-project.supabase.co)"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      "X-Client-Info": "supabase-js-web",
    },
  },
});

// Test connection function
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("count")
      .limit(1);
    if (error) {
      console.error("Supabase connection test failed:", error);
      return false;
    }
    console.log("Supabase connection successful");
    return true;
  } catch (err) {
    console.error("Supabase connection error:", err);
    return false;
  }
};

// Database types
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_admin: boolean;
  goal?: string;
  preferences?: any;
  created_at: string;
  updated_at: string;
}

export interface Roadmap {
  id: string;
  user_id: string;
  title: string;
  goal: string;
  weeks: any[];
  questions?: any;
  answers?: any;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  roadmap_id: string;
  week_number: number;
  title: string;
  lesson_objective: string;
  estimated_time: string;
  content?: any;
  order_index: number;
  created_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  roadmap_id: string;
  total_lessons: number;
  completed_lessons: number;
  total_time_spent: number;
  average_accuracy: number;
  current_week: number;
  updated_at: string;
}

export interface LessonCompletion {
  id: string;
  user_id: string;
  lesson_id: string;
  score?: number;
  time_spent?: number;
  answers?: any;
  completed_at: string;
}
