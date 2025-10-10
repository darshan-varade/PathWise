import { useState, useCallback } from "react";
import { ToastProps } from "../components/UI/Toast";

interface ToastOptions {
  type?: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: ToastProps = {
      id,
      type: options.type || "info",
      title: options.title,
      message: options.message,
      duration: options.duration,
      action: options.action,
      onClose: removeToast,
    };

    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showSuccess = useCallback(
    (title: string, message: string, duration?: number) => {
      return addToast({ type: "success", title, message, duration });
    },
    [addToast]
  );

  const showError = useCallback(
    (
      title: string,
      message: string,
      action?: { label: string; onClick: () => void }
    ) => {
      return addToast({
        type: "error",
        title,
        message,
        duration: 8000,
        action,
      });
    },
    [addToast]
  );

  const showWarning = useCallback(
    (
      title: string,
      message: string,
      action?: { label: string; onClick: () => void }
    ) => {
      return addToast({
        type: "warning",
        title,
        message,
        duration: 6000,
        action,
      });
    },
    [addToast]
  );

  const showInfo = useCallback(
    (title: string, message: string, duration?: number) => {
      return addToast({ type: "info", title, message, duration });
    },
    [addToast]
  );

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll,
  };
};
