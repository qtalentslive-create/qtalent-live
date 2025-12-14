// FILE: src/App.tsx
// FINAL CORRECTED VERSION (with correct import paths)

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
//
// ▼▼▼ THESE ARE THE FIXED IMPORTS ▼▼▼
//
import { AuthProvider, useAuth } from "@/hooks/useAuth"; // 👈 Fixed path
import { registerDeviceForNotifications } from "@/hooks/usePushNotifications"; // 👈 Fixed path
//
// ▲▲▲ END OF FIXED IMPORTS ▲▲▲
//
import { UserModeProvider } from "./contexts/UserModeContext";
import { ChatProvider } from "./contexts/ChatContext";
import { ProStatusProvider } from "./contexts/ProStatusContext";
import { UniversalChat } from "./components/UniversalChat";
import { NotificationPermissionPrompt } from "./components/NotificationPermissionPrompt";
import { UnifiedNotificationHandler } from "./components/UnifiedNotificationhandler";
import { useModalBackdrop } from "./hooks/useModalBackdrop";
import { NativeSafeFooter } from "./components/NativeSafeFooter";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import BookerDashboard from "./pages/BookerDashboard";
import TalentOnboarding from "./pages/TalentOnboarding";
import TalentProfile from "./pages/TalentProfile";
import TalentDashboard from "./pages/TalentDashboard";
import TalentProfileEdit from "./pages/TalentProfileEdit";
import AdminDashboard from "./pages/AdminDashboard";
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminBookings from "./pages/admin/AdminBookings";
import NotFound from "./pages/NotFound";
import { ProtectedTalentRoute } from "./components/ProtectedTalentRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import YourEvent from "./pages/YourEvent";
import Pricing from "./pages/Pricing";
import AuthCallback from "./pages/AuthCallback";
import UpdatePassword from "./pages/UpdatePassword";
import TermsOfService from "./pages/TermsOfService";
import ResetPassword from "./pages/ResetPassword";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import SubscriptionCancelled from "./pages/SubscriptionCancelled";

// 🔐 Global auth listener with PASSWORD_RECOVERY detection
supabase.auth.onAuthStateChange((event, session) => {

  // Set recovery flag when PASSWORD_RECOVERY event is detected
  if (event === "PASSWORD_RECOVERY") {
    sessionStorage.setItem("isPasswordRecovery", "true");
  }
});

const AppContent = () => {
  const navigate = useNavigate();
  const isNativeApp = Capacitor.isNativePlatform();
  //
  // ▼▼▼ THIS IS THE FIX (Part 1) ▼▼▼
  //
  const { user } = useAuth(); // 👈 This will now work
  //
  // ▲▲▲ END OF FIX ▲▲▲
  //

  // Add backdrop for modals, popovers, and selects in Capacitor native apps
  useModalBackdrop();

  useEffect(() => {
    // Handle push notification navigation - wait for user to be authenticated
    const handlePendingNotification = async () => {
      const pendingUrl = sessionStorage.getItem("pending_notification_url");

      if (!pendingUrl) {
        return;
      }

      // Wait for user to be authenticated before navigating
      if (!user) {
        return;
      }

      // Check if we're already on the target page (avoid unnecessary navigation)
      const currentPath = window.location.pathname;
      // Handle both absolute URLs and relative paths
      let targetPath = pendingUrl;
      if (pendingUrl.startsWith("http")) {
        try {
          targetPath = new URL(pendingUrl).pathname;
        } catch {
          targetPath = pendingUrl;
        }
      } else if (!pendingUrl.startsWith("/")) {
        targetPath = `/${pendingUrl}`;
      }

      if (currentPath === targetPath) {
        sessionStorage.removeItem("pending_notification_url");
        return;
      }

      // Small delay to ensure app is fully ready and routes are loaded
      await new Promise((resolve) => setTimeout(resolve, 800));

      sessionStorage.removeItem("pending_notification_url");

      // Use replace: true to avoid adding to history
      try {
        // Ensure URL is a relative path for React Router
        const routePath = pendingUrl.startsWith("http")
          ? new URL(pendingUrl).pathname + new URL(pendingUrl).search
          : pendingUrl;
        navigate(routePath, { replace: true });
      } catch (error) {
        console.error("[App] Error navigating to pending URL:", error);
        // Fallback: try using window.location
        window.location.href = pendingUrl;
      }
    };

    handlePendingNotification();

    // Also listen for custom event when notification is tapped while app is open
    const handleNotificationUpdate = () => {
      handlePendingNotification();
    };

    window.addEventListener(
      "pendingNotificationUrlUpdated",
      handleNotificationUpdate
    );

    return () => {
      window.removeEventListener(
        "pendingNotificationUrlUpdated",
        handleNotificationUpdate
      );
    };
  }, [navigate, user]);

  // Register device for push notifications when user logs in
  useEffect(() => {
    if (user) {
      registerDeviceForNotifications(user.id);
    }
  }, [user]);

    // Handle deep links for native app (password reset, auth callbacks, etc.)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleDeepLink = (event: { url: string }) => {
      try {
        const url = new URL(event.url);
        const path = url.pathname || "";
        const host = url.host || "";
        const queryAndHash = url.search + url.hash;

        // Auth callbacks (custom scheme or https app link)
        if (
          host === "auth" ||
          host === "qtalent.live" ||
          path.includes("/auth/callback") ||
          path.includes("/callback")
        ) {
          const routePath = `/auth/callback${queryAndHash}`;
          console.log("[DeepLink] Navigating to:", routePath);
          navigate(routePath, { replace: true });
          return;
        }

        // Subscription success
        if (host === "subscription-success" || path.includes("subscription-success")) {
          navigate("/subscription-success", { replace: true });
          return;
        }

        // Other paths
        if (path && path !== "/") {
          navigate(path, { replace: true });
        }
      } catch (error) {
        console.error("[DeepLink] Error handling deep link:", error);
      }
    };

    CapacitorApp.addListener("appUrlOpen", handleDeepLink);

    CapacitorApp.getLaunchUrl().then((launchUrl) => {
      if (launchUrl?.url) {
        handleDeepLink({ url: launchUrl.url });
      }
    });

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [navigate]);

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <Toaster />
      <Sonner />
      <UniversalChat />
      <NotificationPermissionPrompt />
      <UnifiedNotificationHandler />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Auth />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="bookings" element={<AdminBookings />} />
        </Route>
        <Route
          path="/booker-dashboard"
          element={
            <ProtectedRoute>
              <BookerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/your-event"
          element={
            <ProtectedRoute>
              <YourEvent />
            </ProtectedRoute>
          }
        />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/subscription-success" element={<SubscriptionSuccess />} />
        <Route
          path="/subscription-cancelled"
          element={<SubscriptionCancelled />}
        />
        <Route path="/talent-onboarding" element={<TalentOnboarding />} />
        <Route
          path="/talent-dashboard"
          element={
            <ProtectedTalentRoute>
              <TalentDashboard />
            </ProtectedTalentRoute>
          }
        />
        <Route
          path="/talent-profile-edit"
          element={
            <ProtectedTalentRoute>
              <TalentProfileEdit />
            </ProtectedTalentRoute>
          }
        />
        <Route path="/talent/:id" element={<TalentProfile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <NativeSafeFooter />
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <ProStatusProvider>
      <UserModeProvider>
        <ChatProvider>
          <TooltipProvider>
            <AppContent />
          </TooltipProvider>
        </ChatProvider>
      </UserModeProvider>
    </ProStatusProvider>
  </AuthProvider>
);

export default App;
