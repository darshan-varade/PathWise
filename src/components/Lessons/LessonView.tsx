import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase, Lesson } from "../../lib/supabase";
import { generateLessonContent } from "../../lib/gemini";
import { useToast } from "../../hooks/useToast";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Target,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Code,
  BookOpen,
  Award,
  Eye,
  EyeOff,
} from "lucide-react";

interface LessonContent {
  title: string;
  lessonObjective: string;
  estimatedTime: string;
  lessonContent: string;
  keyConcepts: string[];
  exampleCode: Array<{
    description: string;
    code: string;
    output: string;
  }>;
  interactiveElements: Array<{
    type: "diagram" | "playground" | "demo";
    title: string;
    description: string;
    content: any;
  }>;
  assessmentQuestions: Array<{
    question: string;
    type: "multiple-choice" | "open-ended";
    options?: string[];
    answer: string;
    explanation: string;
  }>;
}

const LessonView: React.FC = () => {
  const { lessonId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [showTest, setShowTest] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [testCompleted, setTestCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [playgroundValues, setPlaygroundValues] = useState<{
    [key: string]: any;
  }>({});

  useEffect(() => {
    if (lessonId && user) {
      fetchLesson();
      checkCompletion();
    }
  }, [lessonId, user]);

  const fetchLesson = async () => {
    try {
      console.log("Fetching lesson with ID:", lessonId);

      // Fetch lesson details with better error handling
      const { data: lessonData, error: lessonError } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .single();

      if (lessonError) {
        console.error("Lesson fetch error:", lessonError);
        throw lessonError;
      }

      if (!lessonData) {
        throw new Error("Lesson not found");
      }

      console.log("Lesson data fetched:", lessonData);
      setLesson(lessonData);

      // Fetch all lessons for navigation
      const { data: allLessonsData, error: allLessonsError } = await supabase
        .from("lessons")
        .select("*")
        .eq("roadmap_id", lessonData.roadmap_id)
        .order("week_number", { ascending: true })
        .order("order_index", { ascending: true });

      if (allLessonsError) {
        console.error("All lessons fetch error:", allLessonsError);
        throw allLessonsError;
      }

      console.log("All lessons fetched:", allLessonsData?.length || 0);
      setAllLessons(allLessonsData || []);

      // Check if lesson content exists in localStorage
      const cachedContent = localStorage.getItem(`lesson_${lessonId}`);
      if (cachedContent) {
        console.log("Using cached lesson content");
        setLessonContent(JSON.parse(cachedContent));
      } else {
        console.log("Generating new lesson content");
        // Generate content from AI
        const content = await generateLessonContent(lessonData);
        setLessonContent(content);
        localStorage.setItem(`lesson_${lessonId}`, JSON.stringify(content));
      }
    } catch (error: any) {
      console.error("Error fetching lesson:", error);
      showError("Loading Failed", error.message || "Failed to load lesson", {
        label: "Retry",
        onClick: fetchLesson,
      });
    } finally {
      setLoading(false);
    }
  };

  const checkCompletion = async () => {
    try {
      const { data, error } = await supabase
        .from("lesson_completions")
        .select("id")
        .eq("user_id", user!.id)
        .eq("lesson_id", lessonId!)
        .maybeSingle();

      if (error) throw error;
      setIsCompleted(!!data);
    } catch (error) {
      console.error("Error checking completion:", error);
    }
  };

  const handleMarkComplete = async () => {
    try {
      await supabase.from("lesson_completions").upsert({
        user_id: user!.id,
        lesson_id: lessonId!,
        score: 100,
        time_spent: 30,
        answers: {},
        completed_at: new Date().toISOString(),
      });

      setIsCompleted(true);
      showSuccess(
        "Lesson Completed",
        "Great job! You can now move to the next lesson."
      );

      // Update user progress
      const { data: progressData } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user!.id)
        .eq("roadmap_id", lesson!.roadmap_id)
        .single();

      if (progressData) {
        const oldCompletedLessons = progressData.completed_lessons;
        const oldAverageAccuracy = progressData.average_accuracy || 0;
        const newCompletedLessons = oldCompletedLessons + 1;
        const newAverageAccuracy =
          (oldAverageAccuracy * oldCompletedLessons + 100) /
          newCompletedLessons;

        await supabase
          .from("user_progress")
          .update({
            completed_lessons: newCompletedLessons,
            total_time_spent: progressData.total_time_spent + 30,
            average_accuracy: newAverageAccuracy,
          })
          .eq("id", progressData.id);
      }
    } catch (error: any) {
      console.error("Error marking complete:", error);
      showError(
        "Save Failed",
        "Failed to mark lesson as complete. Please try again."
      );
    }
  };

  const handleStartTest = () => {
    setShowTest(true);
    setCurrentQuestion(0);
    setUserAnswers([]);
    setTestCompleted(false);
    setShowAnswers(false);
  };

  const handleAnswerSelect = (answer: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = answer;
    setUserAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < lessonContent!.assessmentQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      completeTest();
    }
  };

  const completeTest = async () => {
    try {
      const questions = lessonContent!.assessmentQuestions;
      let correctAnswers = 0;

      questions.forEach((question, index) => {
        const userAnswer = userAnswers[index]?.trim().toLowerCase() || "";
        const correctAnswer = question.answer?.trim().toLowerCase() || "";

        if (userAnswer === correctAnswer) {
          correctAnswers++;
        }
      });

      const finalScore = Math.round((correctAnswers / questions.length) * 100);
      setScore(finalScore);
      setTestCompleted(true);

      // Save completion to database
      await supabase.from("lesson_completions").upsert({
        user_id: user!.id,
        lesson_id: lessonId!,
        score: finalScore,
        time_spent: 30,
        answers: userAnswers,
        completed_at: new Date().toISOString(),
      });

      setIsCompleted(true);

      // Update user progress
      const { data: progressData } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user!.id)
        .eq("roadmap_id", lesson!.roadmap_id)
        .single();

      if (progressData) {
        const oldCompletedLessons = progressData.completed_lessons;
        const oldAverageAccuracy = progressData.average_accuracy || 0;
        const newCompletedLessons = oldCompletedLessons + 1;
        const newAverageAccuracy =
          (oldAverageAccuracy * oldCompletedLessons + finalScore) /
          newCompletedLessons;

        await supabase
          .from("user_progress")
          .update({
            completed_lessons: newCompletedLessons,
            total_time_spent: progressData.total_time_spent + 30,
            average_accuracy: newAverageAccuracy,
          })
          .eq("id", progressData.id);
      }

      showSuccess(
        "Test Completed",
        `You scored ${finalScore}%! ${
          finalScore >= 70 ? "Great job!" : "Consider reviewing the material."
        }`
      );
    } catch (error: any) {
      console.error("Error saving completion:", error);
      showError(
        "Save Failed",
        "Failed to save test results. Please try again."
      );
    }
  };

  const navigateToLesson = (direction: "prev" | "next") => {
    const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
    let targetIndex =
      direction === "next" ? currentIndex + 1 : currentIndex - 1;

    if (targetIndex >= 0 && targetIndex < allLessons.length) {
      setShowTest(false);
      setTestCompleted(false);
      setCurrentQuestion(0);
      setUserAnswers([]);
      setScore(0);

      navigate(`/lessons/${allLessons[targetIndex].id}`);
    }
  };

  const renderInteractiveElement = (element: any, index: number) => {
    switch (element.type) {
      case "playground":
        return (
          <div
            key={index}
            className="bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg p-4">
            <h4 className="font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
              {element.title}
            </h4>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
              {element.description}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                  Input
                </label>
                <textarea
                  value={playgroundValues[`playground_${index}`] || ""}
                  onChange={(e) =>
                    setPlaygroundValues((prev) => ({
                      ...prev,
                      [`playground_${index}`]: e.target.value,
                    }))
                  }
                  className="w-full p-3 border border-light-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-light-text-primary dark:text-dark-text-primary"
                  rows={4}
                  placeholder="Try typing something here..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                  Output
                </label>
                <div className="w-full p-3 border border-light-border dark:border-dark-border rounded-lg bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary min-h-[100px]">
                  {playgroundValues[`playground_${index}`] ||
                    "Output will appear here..."}
                </div>
              </div>
            </div>
          </div>
        );

      case "demo":
        return (
          <div
            key={index}
            className="bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg p-4">
            <h4 className="font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
              {element.title}
            </h4>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
              {element.description}
            </p>
            <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg p-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-light-primary dark:bg-dark-primary rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Play className="w-8 h-8 text-white" />
                </div>
                <p className="text-light-text-primary dark:text-dark-text-primary">
                  Interactive demo placeholder
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div
            key={index}
            className="bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg p-4">
            <h4 className="font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
              {element.title}
            </h4>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              {element.description}
            </p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-primary dark:border-dark-primary mx-auto"></div>
          <p className="mt-4 text-light-text-secondary dark:text-dark-text-secondary">
            Loading lesson...
          </p>
        </div>
      </div>
    );
  }

  if (!lesson || !lessonContent) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-light-error dark:text-dark-error" />
        <h3 className="mt-2 text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
          Lesson not found
        </h3>
        <button
          onClick={fetchLesson}
          className="mt-4 px-4 py-2 bg-light-primary dark:bg-dark-primary text-white rounded-lg hover:bg-light-primary/90 dark:hover:bg-dark-hover">
          Try Again
        </button>
      </div>
    );
  }

  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < allLessons.length - 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-light-border dark:border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
            <span>Week {lesson.week_number}</span>
            <span>•</span>
            <span>
              Lesson {currentIndex + 1} of {allLessons.length}
            </span>
            {isCompleted && (
              <>
                <span>•</span>
                <div className="flex items-center space-x-1 text-light-success dark:text-dark-accent">
                  <CheckCircle className="w-4 h-4" />
                  <span>Completed</span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
            <Clock className="w-4 h-4" />
            <span>{lessonContent.estimatedTime}</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
          {lessonContent.title}
        </h1>

        <div className="flex items-center space-x-2 text-light-primary dark:text-dark-primary">
          <Target className="w-4 h-4" />
          <span className="text-sm font-medium">
            {lessonContent.lessonObjective}
          </span>
        </div>
      </div>

      {!showTest ? (
        <>
          {/* Lesson Content */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-light-border dark:border-dark-border">
            <div className="prose max-w-none">
              <div className="text-light-text-primary dark:text-dark-text-primary leading-relaxed mb-6">
                {lessonContent.lessonContent
                  .split("\n")
                  .map((paragraph, index) => (
                    <p key={index} className="mb-4">
                      {paragraph}
                    </p>
                  ))}
              </div>

              {/* Key Concepts */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-3">
                  Key Concepts
                </h3>
                <ul className="space-y-2">
                  {lessonContent.keyConcepts.map((concept, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-light-success dark:text-dark-accent mt-0.5 flex-shrink-0" />
                      <span className="text-light-text-primary dark:text-dark-text-primary">
                        {concept}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Interactive Elements */}
              {lessonContent.interactiveElements &&
                lessonContent.interactiveElements.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-3">
                      Interactive Learning
                    </h3>
                    <div className="space-y-4">
                      {lessonContent.interactiveElements.map((element, index) =>
                        renderInteractiveElement(element, index)
                      )}
                    </div>
                  </div>
                )}

              {/* Example Code */}
              {lessonContent.exampleCode.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-3">
                    Examples
                  </h3>
                  <div className="space-y-4">
                    {lessonContent.exampleCode.map((example, index) => (
                      <div
                        key={index}
                        className="border border-light-border dark:border-dark-border rounded-lg overflow-hidden">
                        <div className="bg-light-bg dark:bg-dark-bg px-4 py-2 border-b border-light-border dark:border-dark-border">
                          <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                            {example.description}
                          </p>
                        </div>
                        <div className="p-4">
                          <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto text-sm">
                            <code>{example.code}</code>
                          </pre>
                          {example.output && (
                            <div className="mt-3">
                              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">
                                Output:
                              </p>
                              <div className="bg-light-bg dark:bg-dark-bg p-3 rounded-lg">
                                <code className="text-sm text-light-text-primary dark:text-dark-text-primary">
                                  {example.output}
                                </code>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-light-border dark:border-dark-border">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateToLesson("prev")}
                disabled={!canGoPrev}
                className="flex items-center space-x-2 px-4 py-2 bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary rounded-lg hover:bg-light-border/50 dark:hover:bg-dark-border/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center space-x-3">
                {!isCompleted && (
                  <button
                    onClick={handleMarkComplete}
                    className="flex items-center space-x-2 px-6 py-2 bg-light-success dark:bg-dark-accent text-white rounded-lg hover:bg-light-success/90 dark:hover:bg-dark-accent/90 transition-colors">
                    <CheckCircle className="w-4 h-4" />
                    <span>Mark Complete</span>
                  </button>
                )}

                <button
                  onClick={handleStartTest}
                  className="bg-gradient-to-r from-light-primary to-light-accent dark:from-dark-primary dark:to-dark-accent text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-all duration-200 transform hover:scale-105">
                  Take Test
                </button>
              </div>

              <button
                onClick={() => navigateToLesson("next")}
                disabled={!canGoNext}
                className="flex items-center space-x-2 px-4 py-2 bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary rounded-lg hover:bg-light-border/50 dark:hover:bg-dark-border/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Test Section */
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-light-border dark:border-dark-border">
          {!testCompleted ? (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
                    Question {currentQuestion + 1} of{" "}
                    {lessonContent.assessmentQuestions.length}
                  </h3>
                  <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    {Math.round(
                      ((currentQuestion + 1) /
                        lessonContent.assessmentQuestions.length) *
                        100
                    )}
                    % Complete
                  </div>
                </div>
                <div className="w-full bg-light-border dark:bg-dark-border rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-light-primary to-light-accent dark:from-dark-primary dark:to-dark-accent h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        ((currentQuestion + 1) /
                          lessonContent.assessmentQuestions.length) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-medium text-light-text-primary dark:text-dark-text-primary">
                  {lessonContent.assessmentQuestions[currentQuestion].question}
                </h4>

                {lessonContent.assessmentQuestions[currentQuestion].type ===
                "multiple-choice" ? (
                  <div className="space-y-2">
                    {lessonContent.assessmentQuestions[
                      currentQuestion
                    ].options?.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(option)}
                        className={`w-full text-left p-4 border rounded-lg transition-colors ${
                          userAnswers[currentQuestion] === option
                            ? "border-light-primary dark:border-dark-primary bg-light-primary/10 dark:bg-dark-primary/10"
                            : "border-light-border dark:border-dark-border hover:border-light-primary dark:hover:border-dark-primary hover:bg-light-primary/5 dark:hover:bg-dark-primary/5"
                        }`}>
                        <span className="text-light-text-primary dark:text-dark-text-primary">
                          {option}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={userAnswers[currentQuestion] || ""}
                    onChange={(e) => handleAnswerSelect(e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full p-4 border border-light-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-light-text-primary dark:text-dark-text-primary focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
                    rows={4}
                  />
                )}
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setShowTest(false)}
                  className="px-4 py-2 bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary rounded-lg hover:bg-light-border/50 dark:hover:bg-dark-border/50 transition-colors">
                  Back to Lesson
                </button>
                <button
                  onClick={handleNextQuestion}
                  disabled={!userAnswers[currentQuestion]}
                  className="px-6 py-2 bg-gradient-to-r from-light-primary to-light-accent dark:from-dark-primary dark:to-dark-accent text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
                  {currentQuestion <
                  lessonContent.assessmentQuestions.length - 1
                    ? "Next Question"
                    : "Finish Test"}
                </button>
              </div>
            </>
          ) : (
            /* Test Results */
            <div className="text-center py-8">
              <div
                className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  score >= 70
                    ? "bg-light-success/10 dark:bg-dark-accent/10"
                    : "bg-light-error/10 dark:bg-dark-error/10"
                }`}>
                {score >= 70 ? (
                  <Award
                    className={`w-8 h-8 text-light-success dark:text-dark-accent`}
                  />
                ) : (
                  <RotateCcw
                    className={`w-8 h-8 text-light-error dark:text-dark-error`}
                  />
                )}
              </div>
              <h3 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                Test Complete!
              </h3>
              <p className="text-lg text-light-text-secondary dark:text-dark-text-secondary mb-4">
                Your score: {score}%
              </p>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-6">
                {score >= 70
                  ? "Great job! You can move on to the next lesson."
                  : "Consider reviewing the lesson material and trying again."}
              </p>

              <div className="flex justify-center space-x-4 mb-6">
                <button
                  onClick={() => setShowAnswers(!showAnswers)}
                  className="flex items-center space-x-2 px-4 py-2 bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary rounded-lg hover:bg-light-border/50 dark:hover:bg-dark-border/50 transition-colors">
                  {showAnswers ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  <span>{showAnswers ? "Hide" : "Show"} Answers</span>
                </button>
                <button
                  onClick={() => setShowTest(false)}
                  className="px-4 py-2 bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary rounded-lg hover:bg-light-border/50 dark:hover:bg-dark-border/50 transition-colors">
                  Review Lesson
                </button>
                {canGoNext && (
                  <button
                    onClick={() => navigateToLesson("next")}
                    className="px-6 py-2 bg-gradient-to-r from-light-primary to-light-accent dark:from-dark-primary dark:to-dark-accent text-white rounded-lg font-medium hover:opacity-90 transition-all duration-200">
                    Next Lesson
                  </button>
                )}
              </div>

              {/* Answer Review */}
              {showAnswers && (
                <div className="text-left space-y-4 border-t border-light-border dark:border-dark-border pt-6">
                  <h4 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
                    Answer Review
                  </h4>
                  {lessonContent.assessmentQuestions.map((question, index) => {
                    const userAnswer = userAnswers[index];
                    const isCorrect =
                      userAnswer?.toLowerCase().trim() ===
                      question.answer?.toLowerCase().trim();

                    return (
                      <div
                        key={index}
                        className="bg-light-bg dark:bg-dark-bg rounded-lg p-4">
                        <div className="flex items-start space-x-2 mb-2">
                          {isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-light-success dark:text-dark-accent mt-0.5" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-light-error dark:text-dark-error mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                              {question.question}
                            </p>
                            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                              Your answer:{" "}
                              <span
                                className={
                                  isCorrect
                                    ? "text-light-success dark:text-dark-accent"
                                    : "text-light-error dark:text-dark-error"
                                }>
                                {userAnswer || "No answer"}
                              </span>
                            </p>
                            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                              Correct answer:{" "}
                              <span className="text-light-success dark:text-dark-accent">
                                {question.answer}
                              </span>
                            </p>
                            {question.explanation && (
                              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2 italic">
                                {question.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LessonView;
