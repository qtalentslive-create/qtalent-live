import { useEffect } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useCapacitorPushNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) {
      return;
    }

    const initPushNotifications = async () => {
      try {
        // Request permission
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === "prompt") {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== "granted") {
          console.log("Push notification permission denied");
          return;
        }

        // Register for push notifications
        await PushNotifications.register();

        // Listen for registration
        await PushNotifications.addListener("registration", async (token) => {
          console.log("Push registration success, token:", token.value);

          // Store token in Supabase
          try {
            const { error } = await supabase.from("push_subscriptions").insert({
              user_id: user.id,
              endpoint: token.value,
              p256dh: "capacitor",
              auth: "capacitor",
            });

            if (error) {
              console.error("Error storing push token:", error);
            }
          } catch (err) {
            console.error("Error storing push token:", err);
          }
        });

        // Listen for registration errors
        await PushNotifications.addListener("registrationError", (error) => {
          console.error("Error on registration:", error);
        });

        // Listen for push notifications
        await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("Push notification received:", notification);

            // Show toast for foreground notifications
            toast({
              title: notification.title || "New Notification",
              description: notification.body || "",
            });
          }
        );

        // Listen for notification actions (when user taps notification)
        await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (notification) => {
            console.log("Push notification action performed:", notification);
            console.log(
              "Full notification data:",
              JSON.stringify(notification, null, 2)
            );

            // Try multiple ways to extract the URL
            const url =
              notification.notification?.data?.url ||
              notification.notification?.data?.URL;

            if (url) {
              console.log(
                `[PushNotification] Saving pending notification URL: ${url}`
              );
              sessionStorage.setItem("pending_notification_url", url);

              // Trigger a custom event to notify App.tsx that a notification was tapped
              // This helps when app is already open in background
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("pendingNotificationUrlUpdated")
                );
              }
            } else {
              console.warn(
                "[PushNotification] No URL found in notification data:",
                notification
              );
            }
          }
        );
      } catch (error) {
        console.error("Error initializing push notifications:", error);
      }
    };

    initPushNotifications();

    return () => {
      if (Capacitor.isNativePlatform()) {
        PushNotifications.removeAllListeners();
      }
    };
  }, [user]);
};
