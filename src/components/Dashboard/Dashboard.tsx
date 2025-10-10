import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  supabase,
  UserProgress,
  Roadmap,
  LessonCompletion,
} from "../../lib/supabase";
import {
  BookOpen,
  Clock,
  Target,
  TrendingUp,
  Calendar,
  CheckCircle,
  BarChart3,
  Award,
} from "lucide-react";

const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [recentCompletions, setRecentCompletions] = useState<
    LessonCompletion[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile) {
      console.log("User and profile available, fetching dashboard data");
      fetchUserData();
    } else if (user && !profile) {
      console.log("User available but no profile, waiting...");
      // Set a timeout to wait for profile to load
      const timeout = setTimeout(() => {
        if (!profile) {
          console.log("Profile still not loaded, proceeding anyway");
          fetchUserData();
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [user, profile]);

  const fetchUserData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      console.log("Fetching dashboard data for user:", user.id);

      // Fetch user's roadmap with longer timeout
      const roadmapPromise = supabase
        .from("roadmaps")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 30000)
      );

      const { data: roadmapData, error: roadmapError } = (await Promise.race([
        roadmapPromise,
        timeoutPromise,
      ])) as any;

      if (roadmapError) {
        console.error("Roadmap error:", roadmapError);
        throw roadmapError;
      }

      if (!roadmapData || roadmapData.length === 0) {
        console.log("No roadmap found for user");
        setRoadmap(null);
        setProgress(null);
        setLoading(false);
        return;
      }

      const currentRoadmap = roadmapData[0];
      setRoadmap(currentRoadmap);
      console.log("Roadmap loaded:", currentRoadmap.title);

      // Fetch user progress with longer timeout
      const progressPromise = supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("roadmap_id", currentRoadmap.id)
        .order("updated_at", { ascending: false })
        .limit(1);

      const { data: progressData, error: progressError } = (await Promise.race([
        progressPromise,
        timeoutPromise,
      ])) as any;

      if (progressError) {
        console.error("Progress error:", progressError);
        setProgress(null);
      } else {
        const currentProgress =
          progressData && progressData.length > 0 ? progressData[0] : null;
        setProgress(currentProgress);
        console.log("Progress loaded:", currentProgress);
      }

      // Fetch recent lesson completions for achievements
      const { data: completionsData, error: completionsError } = await supabase
        .from("lesson_completions")
        .select(
          `
          *,
          lessons!inner(title, roadmap_id)
        `
        )
        .eq("user_id", user.id)
        .eq("lessons.roadmap_id", currentRoadmap.id)
        .order("completed_at", { ascending: false })
        .limit(5);

      if (completionsError) {
        console.error("Completions error:", completionsError);
        setRecentCompletions([]);
      } else {
        setRecentCompletions(completionsData || []);
        console.log("Recent completions loaded:", completionsData?.length || 0);
      }
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      setError(error.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while auth is still initializing
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-primary dark:border-dark-primary mx-auto"></div>
          <p className="mt-4 text-light-text-secondary dark:text-dark-text-secondary">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <BookOpen className="mx-auto h-12 w-12 text-light-error dark:text-dark-error" />
        <h3 className="mt-2 text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
          Error loading dashboard
        </h3>
        <p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">
          {error}
        </p>
        <button
          onClick={fetchUserData}
          className="mt-4 px-4 py-2 bg-light-primary dark:bg-dark-primary text-white rounded-lg hover:bg-light-primary/90 dark:hover:bg-dark-hover">
          Try Again
        </button>
      </div>
    );
  }

  if (!roadmap || !progress) {
    return (
      <div className="text-center py-12">
        <BookOpen className="mx-auto h-12 w-12 text-light-text-secondary dark:text-dark-text-secondary" />
        <h3 className="mt-2 text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
          No roadmap found
        </h3>
        <p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Get started by creating your learning roadmap.
        </p>
      </div>
    );
  }

  const completionPercentage = Math.round(
    (progress.completed_lessons / Math.max(progress.total_lessons, 1)) * 100
  );
  const totalWeeks = Array.isArray(roadmap.weeks) ? roadmap.weeks.length : 0;
  const weekProgress =
    totalWeeks > 0 ? Math.round((progress.current_week / totalWeeks) * 100) : 0;

  const stats = [
    {
      title: "Roadmap Progress",
      value: `${completionPercentage}%`,
      subtitle: `${progress.completed_lessons} of ${progress.total_lessons} lessons`,
      icon: Target,
      color: "text-light-primary dark:text-dark-primary",
      bgColor: "bg-light-primary/10 dark:bg-dark-primary/10",
    },
    {
      title: "Time Spent",
      value: `${Math.floor(progress.total_time_spent / 60)}h ${
        progress.total_time_spent % 60
      }m`,
      subtitle: "Total study time",
      icon: Clock,
      color: "text-light-success dark:text-dark-accent",
      bgColor: "bg-light-success/10 dark:bg-dark-accent/10",
    },
    {
      title: "Test Accuracy",
      value: `${Math.round(progress.average_accuracy)}%`,
      subtitle: "Average test score",
      icon: BarChart3,
      color: "text-light-accent dark:text-dark-primary",
      bgColor: "bg-light-accent/10 dark:bg-dark-primary/10",
    },
    {
      title: "Current Week",
      value: `Week ${progress.current_week}`,
      subtitle: `${weekProgress}% of roadmap`,
      icon: Calendar,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-light-primary to-light-accent dark:from-dark-primary dark:to-dark-accent rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back!</h1>
            <p className="text-blue-100 mt-1">Continue your learning journey</p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-blue-100">Current Goal:</p>
          <p className="text-lg font-medium">{roadmap.goal}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-light-border dark:border-dark-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mt-1">
                    {stat.value}
                  </p>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                    {stat.subtitle}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Roadmap Progress */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
              Roadmap Progress
            </h3>
            <Target className="w-5 h-5 text-light-primary dark:text-dark-primary" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">
                <span>Overall Progress</span>
                <span>{completionPercentage}%</span>
              </div>
              <div className="w-full bg-light-border dark:bg-dark-border rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-light-primary to-light-accent dark:from-dark-primary dark:to-dark-accent h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">
                <span>Week Progress</span>
                <span>{weekProgress}%</span>
              </div>
              <div className="w-full bg-light-border dark:bg-dark-border rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-light-success to-light-primary dark:from-dark-accent dark:to-dark-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${weekProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Achievements */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
              Recent Achievements
            </h3>
            <Award className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="space-y-3">
            {recentCompletions.length > 0 ? (
              recentCompletions.map((completion, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-light-success dark:bg-dark-accent rounded-full"></div>
                  <span className="text-sm text-light-text-primary dark:text-dark-text-primary">
                    Completed:{" "}
                    {(completion as any).lessons?.title || "Unknown Lesson"}
                    {completion.score && (
                      <span className="text-light-success dark:text-dark-accent ml-2">
                        ({completion.score}%)
                      </span>
                    )}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  No achievements yet. Complete your first lesson to see
                  achievements here!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current Week Overview */}
      {Array.isArray(roadmap.weeks) &&
        roadmap.weeks[progress.current_week - 1] && (
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-light-border dark:border-dark-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
                Current Week: Week {progress.current_week}
              </h3>
              <BookOpen className="w-5 h-5 text-light-primary dark:text-dark-primary" />
            </div>

            <div>
              <h4 className="font-medium text-light-text-primary dark:text-dark-text-primary mb-4">
                {roadmap.weeks[progress.current_week - 1].title}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roadmap.weeks[progress.current_week - 1].topics?.map(
                  (topic: any, index: number) => (
                    <div
                      key={index}
                      className="bg-light-bg dark:bg-dark-bg rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-light-text-primary dark:text-dark-text-primary">
                            {topic.title}
                          </h5>
                          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                            {topic.lessonObjective}
                          </p>
                          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2">
                            {topic.estimatedTime}
                          </p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary ml-2" />
                      </div>
                    </div>
                  )
                ) || []}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Dashboard;
