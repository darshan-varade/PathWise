import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { generateQuestions, generateRoadmap } from "../../lib/gemini";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../hooks/useToast";
import {
  Target,
  MessageCircle,
  Map,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

const OnboardingFlow: React.FC = () => {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const { user, updateProfile } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();

  const handleGoalSubmit = async () => {
    if (!goal.trim()) return;

    setLoading(true);

    try {
      const generatedQuestions = await generateQuestions(goal);
      setQuestions(generatedQuestions);
      setStep(2);
      showSuccess(
        "Questions Generated",
        "Your personalized questions are ready!"
      );
    } catch (error: any) {
      showError(
        "Generation Failed",
        error.message || "Failed to generate questions. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    const currentQ = questions[currentQuestion];
    setAnswers((prev) => ({
      ...prev,
      [currentQ.question]: answer,
    }));

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setStep(3);
    }
  };

  const handleGenerateRoadmap = async () => {
    // FIX: Add a guard clause for the user object
    if (!user) {
      showError(
        "Authentication Error",
        "You must be logged in to create a roadmap."
      );
      return;
    }

    setLoading(true);

    try {
      const roadmapData = await generateRoadmap(goal, answers);

      // Save roadmap to database
      const { data: roadmap, error: roadmapError } = await supabase
        .from("roadmaps")
        .insert({
          user_id: user.id, // No longer need '!'
          title: `Learning Roadmap: ${goal}`,
          goal,
          weeks: roadmapData,
          questions,
          answers,
        })
        .select()
        .single();

      // FIX: Check for both error and a null roadmap object
      if (roadmapError) throw roadmapError;
      if (!roadmap) {
        throw new Error(
          "Failed to retrieve roadmap after creation. Please check table permissions (RLS) and try again."
        );
      }

      // Create lessons from roadmap
      const lessons = roadmapData.flatMap((week: any, weekIndex: number) =>
        week.topics.map((topic: any, topicIndex: number) => ({
          roadmap_id: roadmap.id, // Now this is safe
          week_number: weekIndex + 1,
          title: topic.title,
          lesson_objective: topic.lessonObjective,
          estimated_time: topic.estimatedTime,
          order_index: topicIndex,
        }))
      );

      if (lessons.length > 0) {
        const { error: lessonsError } = await supabase
          .from("lessons")
          .insert(lessons);

        if (lessonsError) throw lessonsError;
      }

      // Initialize user progress
      const { error: progressError } = await supabase
        .from("user_progress")
        .insert({
          user_id: user.id,
          roadmap_id: roadmap.id, // Also safe here
          total_lessons: lessons.length,
          completed_lessons: 0,
          total_time_spent: 0,
          average_accuracy: 0,
          current_week: 1,
        });

      if (progressError) throw progressError;

      // Update user profile with goal
      await updateProfile({ goal });

      showSuccess(
        "Roadmap Created",
        "Your personalized learning roadmap is ready!"
      );
      navigate("/dashboard");
    } catch (error: any) {
      const errorMessage =
        error.message || "Failed to generate roadmap. Please try again.";

      if (errorMessage.includes("AI service is temporarily unavailable")) {
        showError("Creation Failed", errorMessage, {
          action: {
            label: "Retry",
            onClick: handleGenerateRoadmap,
          },
        });
      } else {
        showError("Creation Failed", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-bg via-white to-light-primary/5 dark:from-dark-bg dark:via-dark-card dark:to-dark-primary/5 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-block hover:opacity-80 transition-opacity">
            <img
              src="https://github.com/DarshanVarade/Data/blob/main/PathWise-s-logo.png?raw=true"
              alt="PathWise Logo"
              className="w-16 h-16 mx-auto mb-4"
            />
          </Link>
          <h1 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
            Welcome to PathWise
          </h1>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div
              className={`flex items-center space-x-2 ${
                step >= 1
                  ? "text-light-primary dark:text-dark-primary"
                  : "text-light-text-secondary dark:text-dark-text-secondary"
              }`}>
              <Target className="w-5 h-5" />
              <span className="text-sm font-medium">Goal</span>
            </div>
            <div
              className={`flex items-center space-x-2 ${
                step >= 2
                  ? "text-light-primary dark:text-dark-primary"
                  : "text-light-text-secondary dark:text-dark-text-secondary"
              }`}>
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Questions</span>
            </div>
            <div
              className={`flex items-center space-x-2 ${
                step >= 3
                  ? "text-light-primary dark:text-dark-primary"
                  : "text-light-text-secondary dark:text-dark-text-secondary"
              }`}>
              <Map className="w-5 h-5" />
              <span className="text-sm font-medium">Roadmap</span>
            </div>
          </div>
          <div className="w-full bg-light-border dark:bg-dark-border rounded-full h-2">
            <div
              className="bg-gradient-to-r from-light-primary to-light-accent dark:from-dark-primary dark:to-dark-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Goal Input */}
        {step === 1 && (
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-8 border border-light-border dark:border-dark-border">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-light-primary to-light-accent dark:from-dark-primary dark:to-dark-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                What do you want to learn?
              </h2>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                Tell us your learning goal and we'll create a personalized
                roadmap for you.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label
                  htmlFor="goal"
                  className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                  Your Learning Goal
                </label>
                <textarea
                  id="goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g., I want to become a full-stack web developer, I want to learn machine learning, I want to master React..."
                  className="w-full px-4 py-3 border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-light-text-primary dark:text-dark-text-primary rounded-lg focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent transition-colors"
                  rows={4}
                />
              </div>

              <button
                onClick={handleGoalSubmit}
                disabled={!goal.trim() || loading}
                className="w-full bg-gradient-to-r from-light-primary to-light-accent dark:from-dark-primary dark:to-dark-accent text-white py-3 px-4 rounded-lg font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-2">
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Questions */}
        {step === 2 && questions.length > 0 && (
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-8 border border-light-border dark:border-dark-border">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-light-primary to-light-accent dark:from-dark-primary dark:to-dark-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                Question {currentQuestion + 1} of {questions.length}
              </h2>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                Help us personalize your learning experience
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-light-bg dark:bg-dark-bg rounded-lg p-6">
                <h3 className="text-lg font-medium text-light-text-primary dark:text-dark-text-primary mb-4">
                  {questions[currentQuestion]?.question}
                </h3>
                <div className="space-y-3">
                  {questions[currentQuestion]?.options?.map(
                    (option: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(option)}
                        className="w-full text-left p-4 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg hover:border-light-primary dark:hover:border-dark-primary hover:bg-light-primary/5 dark:hover:bg-dark-primary/5 transition-colors">
                        <span className="text-light-text-primary dark:text-dark-text-primary">
                          {option}
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="flex justify-between text-sm text-light-text-secondary dark:text-dark-text-secondary">
                <span>
                  Progress: {currentQuestion + 1}/{questions.length}
                </span>
                <span>
                  {Math.round(((currentQuestion + 1) / questions.length) * 100)}
                  % complete
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Generate Roadmap */}
        {step === 3 && (
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-8 border border-light-border dark:border-dark-border">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-light-primary to-light-accent dark:from-dark-primary dark:to-dark-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <Map className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                Ready to create your roadmap!
              </h2>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                We'll generate a personalized learning roadmap based on your
                answers.
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-light-bg dark:bg-dark-bg rounded-lg p-6">
                <h3 className="text-lg font-medium text-light-text-primary dark:text-dark-text-primary mb-4">
                  Your Goal:
                </h3>
                <p className="text-light-text-primary dark:text-dark-text-primary">
                  {goal}
                </p>
              </div>

              <div className="bg-light-bg dark:bg-dark-bg rounded-lg p-6">
                <h3 className="text-lg font-medium text-light-text-primary dark:text-dark-text-primary mb-4">
                  Your Answers:
                </h3>
                <div className="space-y-2">
                  {Object.entries(answers).map(([question, answer]) => (
                    <div key={question} className="text-sm">
                      <span className="font-medium text-light-text-primary dark:text-dark-text-primary">
                        {question}:
                      </span>
                      <span className="text-light-text-secondary dark:text-dark-text-secondary ml-2">
                        {answer as string}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateRoadmap}
                disabled={loading}
                className="w-full bg-gradient-to-r from-light-primary to-light-accent dark:from-dark-primary dark:to-dark-accent text-white py-3 px-4 rounded-lg font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-2">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    <span>Generating your roadmap...</span>
                  </>
                ) : (
                  <>
                    <span>Generate My Roadmap</span>
                    <CheckCircle className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingFlow;
