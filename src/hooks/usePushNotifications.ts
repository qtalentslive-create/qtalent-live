// FILE: src/hooks/usePushNotifications.ts
// FINAL CORRECTED VERSION (Uses sessionStorage)

import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  NotificationChannel,
  ActionPerformed,
} from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

/**
 * Creates the Notification Channel required for Android 8.0+
 */
const createNotificationChannel = async () => {
  try {
    const channel: NotificationChannel = {
      id: "default_channel",
      name: "Default Channel",
      description: "Default channel for app notifications",
      importance: 5,
      visibility: 1,
      vibration: true,
    };
    await PushNotifications.createChannel(channel);
  } catch (error) {
    console.error("Error creating notification channel:", error);
  }
};

/**
 * Call this function AFTER a user successfully signs in.
 */
export const registerDeviceForNotifications = async (userId: string) => {
  if (Capacitor.getPlatform() === "web") {
    return;
  }

  if (Capacitor.getPlatform() === "android") {
    await createNotificationChannel();
  }

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === "prompt") {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== "granted") {
      console.warn("User denied push permissions.");
      return;
    }
    await PushNotifications.register();

    PushNotifications.addListener("registration", async (token) => {
      const { error } = await supabase
        .from("profiles")
        .update({ push_token: token.value })
        .eq("id", userId);
      if (error) {
        console.error("Error saving push token to Supabase:", error);
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("!!!!!!!!!! PUSH REGISTRATION FAILED !!!!!!!!!!", err);
    });

    PushNotifications.addListener(
      "pushNotificationReceived",
      () => {}
    );

    //
    // ▼▼▼ THIS IS THE FIX ▼▼▼
    // When a notification is tapped, we DON'T navigate.
    // We just save the URL to sessionStorage.
    //
    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action: ActionPerformed) => {
        // Try multiple ways to extract the URL
        const url =
          action.notification?.data?.url || action.notification?.data?.URL;

        if (url) {
          // We use sessionStorage to store where we want to go.
          sessionStorage.setItem("pending_notification_url", url);

          // Trigger a custom event to notify App.tsx that a notification was tapped
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("pendingNotificationUrlUpdated")
            );
          }
        } else {
          console.warn(
            "[PushNotification] No URL found in notification data:",
            action
          );
        }
      }
    );
  } catch (error) {
    console.error("Error registering for push notifications:", error);
  }
};

/**
 * Call this function BEFORE a user signs out.
 */
export const unregisterDeviceForNotifications = async (userId: string) => {
  if (Capacitor.getPlatform() === "web" || !userId) {
    return;
  }
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ push_token: null })
      .eq("id", userId);
    if (error) {
      console.error("Error deleting push token from Supabase:", error);
    }
  } catch (error) {
    console.error("Error unregistering device:", error);
  }
};
