import React, { Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/Layout/Layout";
import AuthForm from "./components/Auth/AuthForm";
import LandingPage from "./components/Landing/LandingPage";
import ToastContainer from "./components/UI/ToastContainer";
import { useToast } from "./hooks/useToast";

// Lazy load components for better performance
const OnboardingFlow = React.lazy(
  () => import("./components/Onboarding/OnboardingFlow")
);
const Dashboard = React.lazy(() => import("./components/Dashboard/Dashboard"));
const LessonsList = React.lazy(
  () => import("./components/Lessons/LessonsList")
);
const LessonView = React.lazy(() => import("./components/Lessons/LessonView"));
const RoadmapView = React.lazy(
  () => import("./components/Roadmap/RoadmapView")
);
const ProfileView = React.lazy(
  () => import("./components/Profile/ProfileView")
);
const AdminDashboard = React.lazy(
  () => import("./components/Admin/AdminDashboard")
);

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[400px] bg-light-bg dark:bg-dark-bg">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-primary dark:border-dark-primary mx-auto"></div>
      <p className="mt-4 text-light-text-secondary dark:text-dark-text-secondary">
        Loading...
      </p>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user, loading, isNewUser } = useAuth();

  // Show loading spinner while auth is initializing
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/auth"
          element={
            user ? (
              <Navigate to={isNewUser ? "/onboarding" : "/dashboard"} replace />
            ) : (
              <AuthForm />
            )
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingFlow />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/lessons"
          element={
            <ProtectedRoute>
              <Layout>
                <LessonsList />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/lessons/:lessonId"
          element={
            <ProtectedRoute>
              <Layout>
                <LessonView />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/roadmap"
          element={
            <ProtectedRoute>
              <Layout>
                <RoadmapView />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <ProfileView />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* Catch all route for 404s */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  const { toasts, removeToast } = useToast();

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-200">
            <AppRoutes />
            <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
