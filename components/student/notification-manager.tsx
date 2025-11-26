"use client";

import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/ui/notification-bell";
import { useBrowserNotifications } from "./use-browser-notifications";

/**
 * Notification Manager Component
 * Handles browser notification permissions and displays notification bell
 */
export function NotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  // Enable browser notifications
  useBrowserNotifications();

  useEffect(() => {
    // Check notification permission status
    if ("Notification" in window) {
      setPermission(Notification.permission);
      
      // If permission is default (not granted or denied), show prompt after a delay
      if (Notification.permission === "default") {
        // Check if user dismissed it before
        const dismissed = localStorage.getItem("notification_prompt_dismissed");
        if (!dismissed) {
          // Show prompt after 2 seconds
          const timer = setTimeout(() => {
            setShowPermissionPrompt(true);
          }, 2000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, []);

  const requestPermission = async () => {
    if ("Notification" in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPermissionPrompt(false);
      
      if (result === "granted") {
        // Show a welcome notification
        try {
          new Notification("Notifications Enabled!", {
            body: "You'll now receive notifications for new activities and assignments.",
            icon: "/favicon.ico",
          });
        } catch (error) {
          console.error("Error showing welcome notification:", error);
        }
      }
    }
  };

  const dismissPrompt = () => {
    setShowPermissionPrompt(false);
    // Store dismissal in localStorage to not show again for this session
    localStorage.setItem("notification_prompt_dismissed", "true");
  };

  return (
    <>
      <NotificationBell />
      
      {/* Permission Request Prompt */}
      {showPermissionPrompt && permission === "default" && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
          <div className="bg-background border rounded-lg shadow-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🔔</div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">
                  Enable Notifications
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Get notified when new activities are posted or assignments are due.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={requestPermission}
                    className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Enable
                  </button>
                  <button
                    onClick={dismissPrompt}
                    className="text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-md hover:bg-muted/80 transition-colors"
                  >
                    Not Now
                  </button>
                </div>
              </div>
              <button
                onClick={dismissPrompt}
                className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
