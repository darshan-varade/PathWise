import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  BookOpen,
  Home,
  User,
  Map,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
} from "lucide-react";

const Navbar: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleLogoClick = () => {
    if (
      location.pathname === "/dashboard" ||
      location.pathname === "/lessons" ||
      location.pathname === "/roadmap" ||
      location.pathname === "/profile" ||
      location.pathname === "/admin"
    ) {
      // If user is in the app, go to landing page
      navigate("/");
    } else {
      // If user is on landing page or auth, go to dashboard if logged in
      if (user) {
        navigate("/dashboard");
      } else {
        navigate("/");
      }
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Lessons", href: "/lessons", icon: BookOpen },
    { name: "Roadmap", href: "/roadmap", icon: Map },
    { name: "Profile", href: "/profile", icon: User },
  ];

  if (profile?.is_admin) {
    navItems.push({ name: "Admin", href: "/admin", icon: Shield });
  }

  return (
    <nav className="bg-white dark:bg-dark-card shadow-lg border-b border-light-border dark:border-dark-border transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <button
              onClick={handleLogoClick}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <img
                src="https://github.com/DarshanVarade/Data/blob/main/PathWise-s-logo.png?raw=true"
                alt="PathWise Logo"
                className="w-8 h-8"
              />
              <span className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                PathWise
              </span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-light-primary/10 dark:bg-dark-primary/10 text-light-primary dark:text-dark-primary"
                      : "text-light-text-primary dark:text-dark-text-primary hover:text-light-primary dark:hover:text-dark-primary hover:bg-light-bg dark:hover:bg-dark-bg"
                  }`}>
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-light-border dark:bg-dark-border flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-sm font-medium bg-gradient-to-br from-light-accent to-light-primary w-full h-full flex items-center justify-center">
                    {profile?.full_name?.charAt(0).toUpperCase() || "U"}
                  </span>
                )}
              </div>
              <span className="text-sm text-light-text-primary dark:text-dark-text-primary">
                {profile?.full_name}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-light-text-primary dark:text-dark-text-primary hover:text-light-error dark:hover:text-dark-error hover:bg-light-error/10 dark:hover:bg-dark-error/10 transition-colors">
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-light-text-primary dark:text-dark-text-primary hover:text-light-primary dark:hover:text-dark-primary hover:bg-light-bg dark:hover:bg-dark-bg transition-colors">
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-dark-card border-t border-light-border dark:border-dark-border">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive
                      ? "bg-light-primary/10 dark:bg-dark-primary/10 text-light-primary dark:text-dark-primary"
                      : "text-light-text-primary dark:text-dark-text-primary hover:text-light-primary dark:hover:text-dark-primary hover:bg-light-bg dark:hover:bg-dark-bg"
                  }`}>
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <div className="border-t border-light-border dark:border-dark-border pt-4 pb-1">
              <div className="flex items-center px-3 py-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-light-border dark:bg-dark-border flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-sm font-medium bg-gradient-to-br from-light-accent to-light-primary w-full h-full flex items-center justify-center">
                      {profile?.full_name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  )}
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-light-text-primary dark:text-dark-text-primary">
                    {profile?.full_name}
                  </div>
                  <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    {profile?.email}
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 w-full px-3 py-2 rounded-md text-base font-medium text-light-text-primary dark:text-dark-text-primary hover:text-light-error dark:hover:text-dark-error hover:bg-light-error/10 dark:hover:bg-dark-error/10 transition-colors">
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
