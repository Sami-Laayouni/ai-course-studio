"use client";

import { useEffect, useRef } from "react";

/**
 * Hook to show browser notifications when new notifications arrive
 */
export function useBrowserNotifications() {
  const lastNotificationIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    const checkForNewNotifications = async () => {
      try {
        const response = await fetch("/api/notifications?unread_only=true&limit=10");
        const data = await response.json();

        if (data.notifications && Array.isArray(data.notifications)) {
          const unreadNotifications = data.notifications.filter(
            (n: any) => !n.is_read
          );

          // Check for new notifications
          const newNotifications = unreadNotifications.filter(
            (n: any) => !lastNotificationIdsRef.current.includes(n.id)
          );

          if (newNotifications.length > 0) {
            // Show browser notification for each new notification
            newNotifications.forEach((notification: any) => {
              const notificationTitle = notification.title || "New Notification";
              const notificationBody =
                notification.type === "activity" &&
                notification.data?.captivating_question
                  ? notification.data.captivating_question
                  : notification.message || "You have a new notification";

              try {
                new Notification(notificationTitle, {
                  body: notificationBody,
                  icon: "/favicon.ico",
                  badge: "/favicon.ico",
                  tag: notification.id,
                  requireInteraction: false,
                });
              } catch (error) {
                console.error("Error showing browser notification:", error);
              }
            });

            // Update last notification IDs
            lastNotificationIdsRef.current = unreadNotifications.map(
              (n: any) => n.id
            );
          }
        }
      } catch (error) {
        console.error("Error checking for notifications:", error);
      }
    };

    // Check immediately
    checkForNewNotifications();

    // Check every 30 seconds
    const interval = setInterval(checkForNewNotifications, 30000);

    return () => clearInterval(interval);
  }, []);
}







