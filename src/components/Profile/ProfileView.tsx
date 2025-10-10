import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  User,
  Mail,
  Camera,
  Save,
  AlertCircle,
  CheckCircle,
  Moon,
  Sun,
} from "lucide-react";

const ProfileView: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [selectedAvatar, setSelectedAvatar] = useState(
    profile?.avatar_url || ""
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Predefined avatar options
  const avatarOptions = [
    "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2",
    "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2",
    "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2",
    "https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2",
    "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2",
    "https://images.pexels.com/photos/1300402/pexels-photo-1300402.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2",
    "https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2",
    "https://images.pexels.com/photos/1542085/pexels-photo-1542085.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2",
  ];

  const handleSave = async () => {
    setLoading(true);
    setMessage("");

    try {
      await updateProfile({
        full_name: fullName,
        avatar_url: selectedAvatar,
      });
      setMessage("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      setMessage("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFullName(profile?.full_name || "");
    setSelectedAvatar(profile?.avatar_url || "");
    setIsEditing(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-light-primary to-light-accent dark:from-dark-primary dark:to-dark-accent rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Profile Settings</h1>
            <p className="text-blue-100 mt-1">
              Manage your account information
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <User className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-light-border dark:border-dark-border">
        <div className="p-6 border-b border-light-border dark:border-dark-border">
          <h2 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
            Appearance
          </h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                Theme
              </h3>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Choose between light and dark mode
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:ring-offset-2 ${
                isDark
                  ? "bg-light-primary"
                  : "bg-light-border dark:bg-dark-border"
              }`}>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isDark ? "translate-x-6" : "translate-x-1"
                }`}
              />
              <span className="sr-only">Toggle theme</span>
            </button>
          </div>
          <div className="mt-4 flex items-center space-x-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
            <div className="flex items-center space-x-2">
              <Sun className="w-4 h-4" />
              <span>Light</span>
            </div>
            <div className="flex items-center space-x-2">
              <Moon className="w-4 h-4" />
              <span>Dark</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-light-border dark:border-dark-border">
        <div className="p-6 border-b border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
              Profile Information
            </h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-light-primary dark:bg-dark-primary text-white rounded-lg hover:bg-light-primary/90 dark:hover:bg-dark-hover transition-colors">
                Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {message && (
            <div
              className={`p-4 rounded-lg flex items-center space-x-2 ${
                message.includes("successfully")
                  ? "bg-light-success/10 dark:bg-dark-accent/10 border border-light-success dark:border-dark-accent text-light-success dark:text-dark-accent"
                  : "bg-light-error/10 dark:bg-dark-error/10 border border-light-error dark:border-dark-error text-light-error dark:text-dark-error"
              }`}>
              {message.includes("successfully") ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="text-sm">{message}</span>
            </div>
          )}

          {/* Avatar Selection */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
              Profile Picture
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-light-border dark:bg-dark-border flex items-center justify-center">
                {selectedAvatar ? (
                  <img
                    src={selectedAvatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-light-text-secondary dark:text-dark-text-secondary" />
                )}
              </div>
              {isEditing && (
                <div className="flex-1">
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-3">
                    Choose from predefined avatars:
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    {avatarOptions.map((avatar, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedAvatar(avatar)}
                        className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${
                          selectedAvatar === avatar
                            ? "border-light-primary dark:border-dark-primary ring-2 ring-light-primary/20 dark:ring-dark-primary/20"
                            : "border-light-border dark:border-dark-border hover:border-light-primary dark:hover:border-dark-primary"
                        }`}>
                        <img
                          src={avatar}
                          alt={`Avatar ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary w-5 h-5" />
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!isEditing}
                className={`pl-10 w-full px-4 py-3 border rounded-lg transition-colors ${
                  isEditing
                    ? "border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-light-text-primary dark:text-dark-text-primary focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent"
                    : "border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text-secondary dark:text-dark-text-secondary"
                }`}
                placeholder="Enter your full name"
              />
            </div>
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary w-5 h-5" />
              <input
                id="email"
                type="email"
                value={profile?.email || ""}
                disabled
                className="pl-10 w-full px-4 py-3 border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg rounded-lg text-light-text-secondary dark:text-dark-text-secondary"
              />
            </div>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              Email address cannot be changed
            </p>
          </div>

          {/* Goal (Read-only) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
              Learning Goal
            </label>
            <div className="p-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg">
              <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                {profile?.goal || "No goal set"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex items-center space-x-4 pt-4 border-t border-light-border dark:border-dark-border">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2 bg-light-primary dark:bg-dark-primary text-white rounded-lg hover:bg-light-primary/90 dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Changes</span>
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-2 bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary rounded-lg hover:bg-light-border/50 dark:hover:bg-dark-border/50 transition-colors">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account Statistics */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-light-border dark:border-dark-border">
        <div className="p-6 border-b border-light-border dark:border-dark-border">
          <h2 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
            Account Statistics
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-light-primary/10 dark:bg-dark-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-light-primary dark:text-dark-primary">
                -
              </div>
              <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Lessons Completed
              </div>
            </div>
            <div className="text-center p-4 bg-light-success/10 dark:bg-dark-accent/10 rounded-lg">
              <div className="text-2xl font-bold text-light-success dark:text-dark-accent">
                -
              </div>
              <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Hours Studied
              </div>
            </div>
            <div className="text-center p-4 bg-light-accent/10 dark:bg-dark-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-light-accent dark:text-dark-primary">
                -
              </div>
              <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Average Score
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
