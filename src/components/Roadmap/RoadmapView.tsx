import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  supabase,
  Roadmap,
  Lesson,
  LessonCompletion,
} from "../../lib/supabase";
import { generateRoadmap } from "../../lib/gemini";
import { useToast } from "../../hooks/useToast";
import {
  Map,
  Calendar,
  BookOpen,
  Clock,
  CheckCircle,
  Play,
  Target,
  TrendingUp,
  Trash2,
  Edit,
  AlertTriangle,
  X,
  Save,
} from "lucide-react";

const RoadmapView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showError, showSuccess, showWarning } = useToast();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completions, setCompletions] = useState<LessonCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAlterModal, setShowAlterModal] = useState(false);
  const [alterRequest, setAlterRequest] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRoadmapData();
    }
  }, [user]);

  const fetchRoadmapData = async () => {
    try {
      // Fetch roadmap - get the most recent one instead of using .single()
      const { data: roadmapData, error: roadmapError } = await supabase
        .from("roadmaps")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (roadmapError) throw roadmapError;

      // Check if we have any roadmaps
      if (!roadmapData || roadmapData.length === 0) {
        setRoadmap(null);
        setLoading(false);
        return;
      }

      const currentRoadmap = roadmapData[0];
      setRoadmap(currentRoadmap);

      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("*")
        .eq("roadmap_id", currentRoadmap.id)
        .order("week_number", { ascending: true })
        .order("order_index", { ascending: true });

      if (lessonsError) throw lessonsError;
      setLessons(lessonsData);

      // Fetch completions
      const { data: completionsData, error: completionsError } = await supabase
        .from("lesson_completions")
        .select("*")
        .eq("user_id", user!.id);

      if (completionsError) throw completionsError;
      setCompletions(completionsData || []);
    } catch (error: any) {
      console.error("Error fetching roadmap data:", error);
      showError(
        "Loading Failed",
        error.message || "Failed to load roadmap data",
        {
          label: "Retry",
          onClick: fetchRoadmapData,
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoadmap = async () => {
    if (!roadmap) return;

    setProcessing(true);
    try {
      // Delete the roadmap (this will cascade delete lessons and progress)
      const { error } = await supabase
        .from("roadmaps")
        .delete()
        .eq("id", roadmap.id);

      if (error) throw error;

      showSuccess(
        "Roadmap Deleted",
        "Your roadmap has been deleted successfully."
      );
      // Navigate to onboarding to create a new roadmap
      navigate("/onboarding");
    } catch (error: any) {
      console.error("Error deleting roadmap:", error);
      showError("Delete Failed", "Failed to delete roadmap. Please try again.");
    } finally {
      setProcessing(false);
      setShowDeleteModal(false);
    }
  };

  const handleAlterRoadmap = async () => {
    if (!roadmap || !alterRequest.trim()) return;

    setProcessing(true);
    try {
      // Generate new roadmap based on original goal and alter request
      const prompt = `Original goal: ${roadmap.goal}
      
Current roadmap weeks: ${JSON.stringify(roadmap.weeks)}

User requested changes: ${alterRequest}

Please modify the roadmap according to the user's request while maintaining the overall structure and goal.`;

      const newRoadmapWeeks = await generateRoadmap(roadmap.goal, {
        alterRequest,
      });

      // Update the roadmap
      const { error: updateError } = await supabase
        .from("roadmaps")
        .update({
          weeks: newRoadmapWeeks,
          updated_at: new Date().toISOString(),
        })
        .eq("id", roadmap.id);

      if (updateError) throw updateError;

      // Delete existing lessons
      const { error: deleteLessonsError } = await supabase
        .from("lessons")
        .delete()
        .eq("roadmap_id", roadmap.id);

      if (deleteLessonsError) throw deleteLessonsError;

      // Create new lessons from updated roadmap
      const newLessons: any[] = [];
      newRoadmapWeeks.forEach((week: any, weekIndex: number) => {
        week.topics.forEach((topic: any, topicIndex: number) => {
          newLessons.push({
            roadmap_id: roadmap.id,
            week_number: weekIndex + 1,
            title: topic.title,
            lesson_objective: topic.lessonObjective,
            estimated_time: topic.estimatedTime,
            order_index: topicIndex,
          });
        });
      });

      const { error: lessonsError } = await supabase
        .from("lessons")
        .insert(newLessons);

      if (lessonsError) throw lessonsError;

      // Update user progress
      const { error: progressError } = await supabase
        .from("user_progress")
        .update({
          total_lessons: newLessons.length,
          completed_lessons: 0,
          total_time_spent: 0,
          average_accuracy: 0,
          current_week: 1,
          updated_at: new Date().toISOString(),
        })
        .eq("roadmap_id", roadmap.id);

      if (progressError) throw progressError;

      showSuccess(
        "Roadmap Updated",
        "Your roadmap has been successfully updated with your requested changes."
      );

      // Refresh the data
      await fetchRoadmapData();
      setShowAlterModal(false);
      setAlterRequest("");
    } catch (error: any) {
      console.error("Error altering roadmap:", error);
      showError(
        "Update Failed",
        error.message || "Failed to alter roadmap. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  const isLessonCompleted = (lessonId: string) => {
    return completions.some((completion) => completion.lesson_id === lessonId);
  };

  const getWeekProgress = (week: any) => {
    const weekLessons = lessons.filter(
      (lesson) => lesson.week_number === week.weekNumber
    );
    const completedLessons = weekLessons.filter((lesson) =>
      isLessonCompleted(lesson.id)
    );
    return weekLessons.length > 0
      ? Math.round((completedLessons.length / weekLessons.length) * 100)
      : 0;
  };

  const getOverallProgress = () => {
    if (lessons.length === 0) return 0;
    const completedCount = lessons.filter((lesson) =>
      isLessonCompleted(lesson.id)
    ).length;
    return Math.round((completedCount / lessons.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-primary dark:border-dark-primary mx-auto"></div>
          <p className="mt-4 text-light-text-secondary dark:text-dark-text-secondary">
            Loading roadmap...
          </p>
        </div>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="text-center py-12">
        <Map className="mx-auto h-12 w-12 text-light-text-secondary dark:text-dark-text-secondary" />
        <h3 className="mt-2 text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
          No roadmap found
        </h3>
        <p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Create a roadmap to get started.
        </p>
        <Link
          to="/onboarding"
          className="mt-4 inline-flex items-center px-4 py-2 bg-light-primary dark:bg-dark-primary text-white rounded-lg hover:bg-light-primary/90 dark:hover:bg-dark-hover">
          Create Roadmap
        </Link>
      </div>
    );
  }

  const overallProgress = getOverallProgress();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-light-primary to-light-accent dark:from-dark-primary dark:to-dark-accent rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Learning Roadmap</h1>
            <p className="text-blue-100 mt-1">{roadmap.title}</p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Map className="w-8 h-8" />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="w-4 h-4" />
            <span className="text-sm font-medium">Goal:</span>
          </div>
          <p className="text-blue-100">{roadmap.goal}</p>
        </div>
      </div>

      {/* Progress Overview and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
              Overall Progress
            </h2>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-light-success dark:text-dark-accent" />
              <span className="text-lg font-bold text-light-success dark:text-dark-accent">
                {overallProgress}%
              </span>
            </div>
          </div>
          <div className="w-full bg-light-border dark:bg-dark-border rounded-full h-3">
            <div
              className="bg-gradient-to-r from-light-success to-light-primary dark:from-dark-accent dark:to-dark-primary h-3 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
            {completions.length} of {lessons.length} lessons completed
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-light-border dark:border-dark-border">
          <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
            Roadmap Actions
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => setShowAlterModal(true)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-light-primary dark:bg-dark-primary text-white rounded-lg hover:bg-light-primary/90 dark:hover:bg-dark-hover transition-colors">
              <Edit className="w-4 h-4" />
              <span>Alter Roadmap</span>
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-light-error dark:bg-dark-error text-white rounded-lg hover:bg-light-error/90 dark:hover:bg-dark-error/90 transition-colors">
              <Trash2 className="w-4 h-4" />
              <span>Delete Roadmap</span>
            </button>
          </div>
        </div>
      </div>

      {/* Roadmap Timeline */}
      <div className="space-y-6">
        {roadmap.weeks.map((week: any, weekIndex: number) => {
          const weekNumber = weekIndex + 1;
          const weekLessons = lessons.filter(
            (lesson) => lesson.week_number === weekNumber
          );
          const weekProgress = getWeekProgress({ ...week, weekNumber });

          return (
            <div
              key={weekIndex}
              className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-light-border dark:border-dark-border">
              <div className="p-6 border-b border-light-border dark:border-dark-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        weekProgress === 100
                          ? "bg-light-success/10 dark:bg-dark-accent/10"
                          : weekProgress > 0
                          ? "bg-light-primary/10 dark:bg-dark-primary/10"
                          : "bg-light-border dark:bg-dark-border"
                      }`}>
                      {weekProgress === 100 ? (
                        <CheckCircle className="w-5 h-5 text-light-success dark:text-dark-accent" />
                      ) : (
                        <Calendar
                          className={`w-5 h-5 ${
                            weekProgress > 0
                              ? "text-light-primary dark:text-dark-primary"
                              : "text-light-text-secondary dark:text-dark-text-secondary"
                          }`}
                        />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
                        Week {weekNumber}: {week.title}
                      </h3>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        {weekLessons.length} lessons • {weekProgress}% complete
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                        {weekProgress}%
                      </div>
                      <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                        Complete
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full bg-light-border dark:bg-dark-border rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      weekProgress === 100
                        ? "bg-light-success dark:bg-dark-accent"
                        : weekProgress > 0
                        ? "bg-light-primary dark:bg-dark-primary"
                        : "bg-light-border dark:bg-dark-border"
                    }`}
                    style={{ width: `${weekProgress}%` }}
                  />
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {week.topics.map((topic: any, topicIndex: number) => {
                    const lesson = weekLessons.find(
                      (l) => l.order_index === topicIndex
                    );
                    const isCompleted = lesson
                      ? isLessonCompleted(lesson.id)
                      : false;

                    return (
                      <div
                        key={topicIndex}
                        className="border border-light-border dark:border-dark-border bg-white dark:bg-dark-card rounded-lg p-4 transition-all duration-200 hover:border-light-primary dark:hover:border-dark-primary hover:shadow-md">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-light-text-primary dark:text-dark-text-primary">
                              {topic.title}
                            </h4>
                            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                              {topic.lessonObjective}
                            </p>
                          </div>
                          {isCompleted && (
                            <CheckCircle className="w-5 h-5 text-light-success dark:text-dark-accent ml-2" />
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                            <Clock className="w-4 h-4" />
                            <span>{topic.estimatedTime}</span>
                          </div>

                          {lesson ? (
                            <Link
                              to={`/lessons/${lesson.id}`}
                              className="flex items-center space-x-1 px-3 py-1.5 bg-light-primary dark:bg-dark-primary text-white text-sm rounded-lg hover:bg-light-primary/90 dark:hover:bg-dark-hover transition-colors">
                              {isCompleted ? (
                                <>
                                  <BookOpen className="w-4 h-4" />
                                  <span>Review</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4" />
                                  <span>Start</span>
                                </>
                              )}
                            </Link>
                          ) : (
                            <div className="px-3 py-1.5 bg-light-border dark:bg-dark-border text-light-text-secondary dark:text-dark-text-secondary text-sm rounded-lg">
                              Coming Soon
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-light-error/10 dark:bg-dark-error/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-light-error dark:text-dark-error" />
              </div>
              <h3 className="text-lg font-medium text-light-text-primary dark:text-dark-text-primary">
                Delete Roadmap
              </h3>
            </div>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-6">
              Are you sure you want to delete your current roadmap? This action
              cannot be undone and will remove all your progress. You'll be
              redirected to create a new roadmap.
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDeleteRoadmap}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-light-error dark:bg-dark-error text-white rounded-lg hover:bg-light-error/90 dark:hover:bg-dark-error/90 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2">
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary rounded-lg hover:bg-light-border/50 dark:hover:bg-dark-border/50 disabled:opacity-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alter Roadmap Modal */}
      {showAlterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-light-primary/10 dark:bg-dark-primary/10 rounded-full flex items-center justify-center">
                  <Edit className="w-5 h-5 text-light-primary dark:text-dark-primary" />
                </div>
                <h3 className="text-lg font-medium text-light-text-primary dark:text-dark-text-primary">
                  Alter Roadmap
                </h3>
              </div>
              <button
                onClick={() => setShowAlterModal(false)}
                disabled={processing}
                className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <label
                htmlFor="alterRequest"
                className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                What changes would you like to make to your roadmap?
              </label>
              <textarea
                id="alterRequest"
                value={alterRequest}
                onChange={(e) => setAlterRequest(e.target.value)}
                placeholder="e.g., Add more advanced topics, focus more on practical projects, include specific technologies..."
                className="w-full px-3 py-2 border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-light-text-primary dark:text-dark-text-primary rounded-lg focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
                rows={4}
                disabled={processing}
              />
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleAlterRoadmap}
                disabled={!alterRequest.trim() || processing}
                className="flex-1 px-4 py-2 bg-light-primary dark:bg-dark-primary text-white rounded-lg hover:bg-light-primary/90 dark:hover:bg-dark-hover disabled:opacity-50 transition-colors flex items-center justify-center space-x-2">
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Apply Changes</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowAlterModal(false)}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary rounded-lg hover:bg-light-border/50 dark:hover:bg-dark-border/50 disabled:opacity-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoadmapView;
