import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase, Profile, UserProgress } from "../../lib/supabase";
import {
  Shield,
  Users,
  BookOpen,
  TrendingUp,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface UserWithProgress {
  profile: Profile;
  progress: UserProgress[];
}

const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (profile?.is_admin) {
      fetchUsers();
    }
  }, [profile]);

  const fetchUsers = async () => {
    try {
      // Fetch all users (except admins)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_admin", false)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch progress for each user
      const usersWithProgress: UserWithProgress[] = [];

      for (const profile of profiles) {
        const { data: progress, error: progressError } = await supabase
          .from("user_progress")
          .select("*")
          .eq("user_id", profile.id);

        if (progressError) {
          console.error(
            "Error fetching progress for user:",
            profile.id,
            progressError
          );
          continue;
        }

        usersWithProgress.push({
          profile,
          progress: progress || [],
        });
      }

      setUsers(usersWithProgress);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Delete user's auth record (this will cascade delete all related data)
      const { error } = await supabase.auth.admin.deleteUser(userToDelete.id);

      if (error) throw error;

      setMessage("User deleted successfully");
      setUsers(users.filter((user) => user.profile.id !== userToDelete.id));
      setDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      setMessage("Failed to delete user");
    }
  };

  const getTotalStats = () => {
    const totalUsers = users.length;
    const totalLessons = users.reduce(
      (sum, user) =>
        sum +
        user.progress.reduce(
          (progSum, prog) => progSum + prog.completed_lessons,
          0
        ),
      0
    );
    const totalTime = users.reduce(
      (sum, user) =>
        sum +
        user.progress.reduce(
          (progSum, prog) => progSum + prog.total_time_spent,
          0
        ),
      0
    );
    const avgAccuracy =
      users.length > 0
        ? users.reduce(
            (sum, user) =>
              sum +
              user.progress.reduce(
                (progSum, prog) => progSum + prog.average_accuracy,
                0
              ) /
                Math.max(user.progress.length, 1),
            0
          ) / users.length
        : 0;

    return { totalUsers, totalLessons, totalTime, avgAccuracy };
  };

  if (!profile?.is_admin) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-light-error dark:text-dark-error" />
        <h3 className="mt-2 text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
          Access Denied
        </h3>
        <p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">
          You don't have admin privileges.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-light-primary dark:border-dark-primary"></div>
      </div>
    );
  }

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-pink-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-red-100 mt-1">
              Manage users and monitor progress
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
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

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                Total Users
              </p>
              <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                {stats.totalUsers}
              </p>
            </div>
            <div className="w-12 h-12 bg-light-primary/10 dark:bg-dark-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-light-primary dark:text-dark-primary" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                Lessons Completed
              </p>
              <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                {stats.totalLessons}
              </p>
            </div>
            <div className="w-12 h-12 bg-light-success/10 dark:bg-dark-accent/10 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-light-success dark:text-dark-accent" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                Total Study Time
              </p>
              <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                {Math.floor(stats.totalTime / 60)}h
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm p-6 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                Avg Accuracy
              </p>
              <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                {Math.round(stats.avgAccuracy)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-light-border dark:border-dark-border">
        <div className="p-6 border-b border-light-border dark:border-dark-border">
          <h2 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
            Users & Progress
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-light-bg dark:bg-dark-bg">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                  Goal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                  Time Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                  Accuracy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-card divide-y divide-light-border dark:divide-dark-border">
              {users.map((user) => {
                const totalProgress =
                  user.progress.reduce(
                    (sum, prog) =>
                      sum +
                      (prog.completed_lessons /
                        Math.max(prog.total_lessons, 1)) *
                        100,
                    0
                  ) / Math.max(user.progress.length, 1);

                const totalTime = user.progress.reduce(
                  (sum, prog) => sum + prog.total_time_spent,
                  0
                );
                const avgAccuracy =
                  user.progress.reduce(
                    (sum, prog) => sum + prog.average_accuracy,
                    0
                  ) / Math.max(user.progress.length, 1);

                return (
                  <tr
                    key={user.profile.id}
                    className="hover:bg-light-bg dark:hover:bg-dark-bg">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-light-border dark:bg-dark-border flex items-center justify-center">
                          {user.profile.avatar_url ? (
                            <img
                              src={user.profile.avatar_url}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Users className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                            {user.profile.full_name || "Unnamed User"}
                          </div>
                          <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                            {user.profile.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-light-text-primary dark:text-dark-text-primary max-w-xs truncate">
                        {user.profile.goal || "No goal set"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-light-border dark:bg-dark-border rounded-full h-2 mr-2">
                          <div
                            className="bg-light-primary dark:bg-dark-primary h-2 rounded-full"
                            style={{
                              width: `${Math.min(totalProgress, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-light-text-primary dark:text-dark-text-primary">
                          {Math.round(totalProgress)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text-primary dark:text-dark-text-primary">
                      {Math.floor(totalTime / 60)}h {totalTime % 60}m
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text-primary dark:text-dark-text-primary">
                      {Math.round(avgAccuracy)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button className="text-light-primary dark:text-dark-primary hover:text-light-primary/80 dark:hover:text-dark-hover p-1 rounded">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setUserToDelete(user.profile);
                            setDeleteModalOpen(true);
                          }}
                          className="text-light-error dark:text-dark-error hover:text-light-error/80 dark:hover:text-dark-error/80 p-1 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-light-error/10 dark:bg-dark-error/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-light-error dark:text-dark-error" />
              </div>
              <h3 className="text-lg font-medium text-light-text-primary dark:text-dark-text-primary">
                Delete User
              </h3>
            </div>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-6">
              Are you sure you want to delete{" "}
              <strong>{userToDelete?.full_name || userToDelete?.email}</strong>?
              This action cannot be undone and will remove all their data.
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-light-error dark:bg-dark-error text-white rounded-lg hover:bg-light-error/90 dark:hover:bg-dark-error/90 transition-colors">
                Delete User
              </button>
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary rounded-lg hover:bg-light-border/50 dark:hover:bg-dark-border/50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
