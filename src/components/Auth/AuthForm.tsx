import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  AlertCircle,
  Wifi,
  RefreshCw,
} from "lucide-react";

const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        await signIn(email.trim(), password.trim());
        // Navigation will be handled by the auth context and App.tsx routing
      } else {
        await signUp(email.trim(), password.trim(), fullName.trim());
        // Navigation will be handled by the auth context and App.tsx routing
      }
      setRetryCount(0); // Reset retry count on success
    } catch (error: any) {
      const errorMessage = error.message || "An unexpected error occurred";
      setError(errorMessage);

      // Increment retry count for connection-related errors
      if (
        errorMessage.toLowerCase().includes("timeout") ||
        errorMessage.toLowerCase().includes("network") ||
        errorMessage.toLowerCase().includes("connection")
      ) {
        setRetryCount((prev) => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError("");
    setRetryCount(0);
  };

  const getErrorIcon = () => {
    if (
      error.toLowerCase().includes("timeout") ||
      error.toLowerCase().includes("network") ||
      error.toLowerCase().includes("connection")
    ) {
      return <Wifi className="w-5 h-5" />;
    }
    return <AlertCircle className="w-5 h-5" />;
  };

  const getErrorSeverity = () => {
    if (
      error.toLowerCase().includes("timeout") ||
      error.toLowerCase().includes("network") ||
      error.toLowerCase().includes("connection")
    ) {
      return "warning";
    }
    return "error";
  };

  const isConnectionError =
    error.toLowerCase().includes("timeout") ||
    error.toLowerCase().includes("network") ||
    error.toLowerCase().includes("connection");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-light-bg via-white to-light-primary/5 dark:from-dark-bg dark:via-dark-card dark:to-dark-primary/5 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <img
                src="https://github.com/DarshanVarade/Data/blob/main/PathWise-s-logo.png?raw=true"
                alt="PathWise Logo"
                className="w-16 h-16"
              />
            </Link>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
            {isLogin ? "Welcome back to PathWise" : "Join PathWise"}
          </h2>
          <p className="mt-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
            {isLogin
              ? "Sign in to continue your learning journey"
              : "Start your personalized learning journey"}
          </p>
        </div>

        <div className="bg-white dark:bg-dark-card p-8 rounded-xl shadow-lg border border-light-border dark:border-dark-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div
                className={`p-4 rounded-lg border ${
                  getErrorSeverity() === "warning"
                    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200"
                }`}>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">{getErrorIcon()}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{error}</p>
                    {error.toLowerCase().includes("invalid") &&
                      error.toLowerCase().includes("credentials") && (
                        <p className="text-xs mt-1 opacity-75">
                          Please check your email and password for typos, or
                          create a new account if you haven't signed up yet.
                        </p>
                      )}
                    {isConnectionError && retryCount > 0 && (
                      <p className="text-xs mt-1 opacity-75">
                        Attempt {retryCount + 1} - Connection issues detected
                      </p>
                    )}
                    {isConnectionError && (
                      <div className="mt-3 flex space-x-2">
                        <button
                          type="button"
                          onClick={handleRetry}
                          className="inline-flex items-center space-x-1 text-xs px-3 py-1 bg-yellow-100 dark:bg-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-700 rounded-md transition-colors">
                          <RefreshCw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!isLogin && (
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary w-5 h-5" />
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value.trim())}
                    className="pl-10 w-full px-4 py-3 border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-light-text-primary dark:text-dark-text-primary rounded-lg focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent transition-colors"
                    placeholder="Enter your full name"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary w-5 h-5" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  className="pl-10 w-full px-4 py-3 border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-light-text-primary dark:text-dark-text-primary rounded-lg focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent transition-colors"
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary w-5 h-5" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value.trim())}
                  className="pl-10 pr-10 w-full px-4 py-3 border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-light-text-primary dark:text-dark-text-primary rounded-lg focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent transition-colors"
                  placeholder="Enter your password"
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary disabled:opacity-50"
                  disabled={loading}>
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {!isLogin && (
                <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                  Password must be at least 6 characters long
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-light-primary to-light-accent dark:from-dark-primary dark:to-dark-accent text-white py-3 px-4 rounded-lg font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-2">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </span>
                </>
              ) : (
                <span>{isLogin ? "Sign In" : "Create Account"}</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setRetryCount(0);
              }}
              className="text-light-primary dark:text-dark-primary hover:text-light-primary/80 dark:hover:text-dark-hover font-medium text-sm"
              disabled={loading}>
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>

          {/* Connection Status Indicator */}
          {(loading || isConnectionError) && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-2 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                <div className="w-2 h-2 bg-light-primary dark:bg-dark-primary rounded-full animate-pulse"></div>
                <span>
                  {loading
                    ? "Connecting to server..."
                    : "Connection issues detected"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
