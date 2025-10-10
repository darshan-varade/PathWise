import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, Profile } from "../lib/supabase";
import { useToast } from "../hooks/useToast";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isNewUser: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  setIsNewUser: (value: boolean) => void;
  retryProfileFetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Helper function to format Supabase errors into user-friendly messages
const formatAuthError = (error: any): string => {
  if (!error) return "An unexpected error occurred";

  const errorMessage = error.message || "";
  const errorCode = error.code || "";

  // Handle specific error codes and messages
  switch (errorCode) {
    case "invalid_credentials":
      return "Invalid email or password. Please check your credentials and try again.";

    case "user_already_exists":
    case "email_address_already_exists":
      return "An account with this email already exists. Please sign in instead or use a different email.";

    case "weak_password":
      return "Password is too weak. Please use at least 6 characters with a mix of letters and numbers.";

    case "invalid_email":
      return "Please enter a valid email address.";

    case "email_not_confirmed":
      return "Please check your email and click the confirmation link before signing in.";

    case "too_many_requests":
      return "Too many login attempts. Please wait a few minutes before trying again.";

    case "signup_disabled":
      return "New user registration is currently disabled. Please contact support.";

    case "email_address_invalid":
      return "The email address format is invalid. Please enter a valid email.";

    case "password_too_short":
      return "Password must be at least 6 characters long.";

    case "user_not_found":
      return "No account found with this email address. Please sign up first.";

    case "session_not_found":
      return "Your session has expired. Please sign in again.";

    case "refresh_token_not_found":
      return "Authentication expired. Please sign in again.";

    case "invalid_request":
      return "Invalid request. Please check your information and try again.";

    case "network_error":
      return "Network connection error. Please check your internet connection and try again.";

    default:
      // Handle common error message patterns
      if (errorMessage.toLowerCase().includes("invalid login credentials")) {
        return "Invalid email or password. Please check your credentials and try again.";
      }

      if (errorMessage.toLowerCase().includes("user already registered")) {
        return "An account with this email already exists. Please sign in instead.";
      }

      if (errorMessage.toLowerCase().includes("email not confirmed")) {
        return "Please check your email and click the confirmation link before signing in.";
      }

      if (errorMessage.toLowerCase().includes("weak password")) {
        return "Password is too weak. Please use at least 6 characters.";
      }

      if (errorMessage.toLowerCase().includes("invalid email")) {
        return "Please enter a valid email address.";
      }

      if (
        errorMessage.toLowerCase().includes("timeout") ||
        errorMessage.toLowerCase().includes("timed out")
      ) {
        return "Connection timeout. Please check your internet connection and try again.";
      }

      if (errorMessage.toLowerCase().includes("network")) {
        return "Network connection error. Please check your internet connection and try again.";
      }

      if (errorMessage.toLowerCase().includes("rate limit")) {
        return "Too many attempts. Please wait a few minutes before trying again.";
      }

      if (errorMessage.toLowerCase().includes("database")) {
        return "Database connection error. Please try again in a moment.";
      }

      if (
        errorMessage.toLowerCase().includes("not_found") ||
        errorMessage.toLowerCase().includes("404")
      ) {
        return "Service temporarily unavailable. Please try again in a moment.";
      }

      // Return the original message if it's user-friendly, otherwise a generic message
      if (
        errorMessage &&
        errorMessage.length < 100 &&
        !errorMessage.includes("Error:")
      ) {
        return errorMessage;
      }

      return "An unexpected error occurred. Please try again or contact support if the problem persists.";
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [profileFetchAttempts, setProfileFetchAttempts] = useState(0);
  const { showError, showWarning } = useToast();

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log("Initializing auth...");

        // Reduced timeout to 10 seconds for better UX
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Auth session request timed out")),
            10000
          )
        );

        const {
          data: { session },
          error,
        } = (await Promise.race([sessionPromise, timeoutPromise])) as any;

        if (error) {
          console.error("Session error:", error);
          if (mounted) {
            const errorMsg = formatAuthError(error);
            if (
              errorMsg.includes("timeout") ||
              errorMsg.includes("network") ||
              errorMsg.includes("unavailable")
            ) {
              showWarning(
                "Connection Issue",
                "Having trouble connecting. You can try refreshing the page.",
                {
                  label: "Retry",
                  onClick: () => window.location.reload(),
                }
              );
            } else {
              showError("Authentication Error", errorMsg);
            }
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          console.log("Session found:", !!session?.user);
          setUser(session?.user ?? null);

          if (session?.user) {
            // Fetch profile with fallback mechanism - don't block app startup
            fetchProfile(session.user.id).catch(() => {
              console.warn(
                "Profile fetch failed during initialization, continuing without profile"
              );
            });
          } else {
            setProfile(null);
          }

          setLoading(false);
        }
      } catch (error: any) {
        console.error("Auth initialization error:", error);
        if (mounted) {
          const errorMsg = formatAuthError(error);
          if (
            errorMsg.includes("timeout") ||
            errorMsg.includes("network") ||
            errorMsg.includes("unavailable")
          ) {
            showWarning(
              "Connection Issue",
              "Having trouble connecting. You can try refreshing the page.",
              {
                label: "Retry",
                onClick: () => window.location.reload(),
              }
            );
          } else {
            showError("Initialization Error", errorMsg);
          }
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log("Auth state changed:", event, session?.user?.email);

      try {
        setUser(session?.user ?? null);

        if (session?.user) {
          // Only set isNewUser flag for SIGNED_UP event
          if (event === "SIGNED_UP") {
            setIsNewUser(true);
          }
          // Fetch profile with fallback mechanism - don't block auth flow
          fetchProfile(session.user.id).catch(() => {
            console.warn(
              "Profile fetch failed during auth state change, continuing without profile"
            );
          });
        } else {
          setProfile(null);
          setIsNewUser(false);
        }

        setLoading(false);
      } catch (error: any) {
        console.error("Auth state change error:", error);
        const errorMsg = formatAuthError(error);
        showError("Authentication Error", errorMsg);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [showError, showWarning]);

  const fetchProfile = async (userId: string, isRetry: boolean = false) => {
    try {
      console.log(
        "Fetching profile for user:",
        userId,
        isRetry ? "(retry)" : ""
      );

      // Reduced timeout to 8 seconds for better UX
      const profilePromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile fetch timed out")), 8000)
      );

      const { data, error } = (await Promise.race([
        profilePromise,
        timeoutPromise,
      ])) as any;

      if (error) {
        console.error("Error fetching profile:", error);
        setProfileFetchAttempts((prev) => prev + 1);

        const errorMsg = formatAuthError(error);
        if (errorMsg.includes("timeout")) {
          // Only show warning if this isn't a retry and we haven't shown too many warnings
          if (!isRetry && profileFetchAttempts < 2) {
            showWarning(
              "Loading Issue",
              "Profile loading is taking longer than expected. You can continue using the app.",
              {
                label: "Retry",
                onClick: () => retryProfileFetch(),
              }
            );
          }
        } else {
          showError("Profile Error", errorMsg);
        }

        // Don't throw error to prevent blocking the app
        setProfile(null);
        return;
      }

      if (data) {
        console.log("Profile fetched successfully:", data);
        setProfile(data);
        setProfileFetchAttempts(0); // Reset attempts on success
      } else {
        console.log("No profile found for user, this is normal for new users");
        setProfile(null);
      }
    } catch (error: any) {
      console.error("Profile fetch failed:", error);
      setProfileFetchAttempts((prev) => prev + 1);

      const errorMsg = formatAuthError(error);
      if (errorMsg.includes("timeout")) {
        // Only show warning if this isn't a retry and we haven't shown too many warnings
        if (!isRetry && profileFetchAttempts < 2) {
          showWarning(
            "Loading Issue",
            "Profile loading is taking longer than expected. You can continue using the app.",
            {
              label: "Retry",
              onClick: () => retryProfileFetch(),
            }
          );
        }
      } else {
        showError("Profile Error", errorMsg);
      }

      // Don't throw error to prevent blocking the app
      setProfile(null);
    }
  };

  const retryProfileFetch = async () => {
    if (user) {
      await fetchProfile(user.id, true);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        throw error;
      }

      // Check if user was created successfully
      if (!data.user) {
        throw new Error("Failed to create user account. Please try again.");
      }

      // Profile will be created automatically by database trigger
      if (data.user) {
        // Fetch the profile created by the database trigger
        await fetchProfile(data.user.id);

        // Set flag for new user
        setIsNewUser(true);
      }
    } catch (error: any) {
      setIsNewUser(false);
      console.error("Sign up error:", error);
      const errorMsg = formatAuthError(error);
      showError("Sign Up Failed", errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setIsNewUser(false); // Clear flag for existing user
      console.log("Signing in user:", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("Sign in failed. Please try again.");
      }

      console.log("Sign in successful, user:", data.user?.email);

      // Explicitly fetch the profile to ensure it's loaded into state
      await fetchProfile(data.user.id);

      // Clear new user flag for existing users
      setIsNewUser(false);
    } catch (error: any) {
      setLoading(false);
      console.error("Sign in error:", error);
      const errorMsg = formatAuthError(error);
      showError("Sign In Failed", errorMsg);
      throw new Error(errorMsg);
    }
  };

  const signOut = async () => {
    try {
      setIsNewUser(false);
      setProfileFetchAttempts(0); // Reset attempts on sign out
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error("Sign out error:", error);
      const errorMsg = formatAuthError(error);
      showError("Sign Out Failed", errorMsg);
      throw new Error(errorMsg);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error("No user logged in");

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email || "",
          ...updates,
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      // Refresh profile
      await fetchProfile(user.id);
    } catch (error: any) {
      console.error("Update profile error:", error);
      const errorMsg = formatAuthError(error);
      showError("Update Failed", errorMsg);
      throw new Error(errorMsg);
    }
  };

  const value = {
    user,
    profile,
    loading,
    isNewUser,
    signUp,
    signIn,
    signOut,
    updateProfile,
    setIsNewUser,
    retryProfileFetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
