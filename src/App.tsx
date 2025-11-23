// FILE: src/App.tsx
// FINAL CORRECTED VERSION (with correct import paths)

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react"; // 👈 This was part of the fix
import { supabase } from "@/integrations/supabase/client";
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
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import TrustSafety from "./pages/TrustSafety";
import ResetPassword from "./pages/ResetPassword";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import SubscriptionCancelled from "./pages/SubscriptionCancelled";

// 🔐 Global auth listener with PASSWORD_RECOVERY detection
supabase.auth.onAuthStateChange((event, session) => {
  console.log("Supabase Auth State Change Event:", { event, session });

  // Set recovery flag when PASSWORD_RECOVERY event is detected
  if (event === "PASSWORD_RECOVERY") {
    sessionStorage.setItem("isPasswordRecovery", "true");
    console.log(
      "[App] PASSWORD_RECOVERY event detected globally - recovery flag set"
    );
  }
});

const AppContent = () => {
  const navigate = useNavigate();
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

      console.log(`[App] Found pending notification URL: ${pendingUrl}`);

      // Wait for user to be authenticated before navigating
      if (!user) {
        console.log(
          "[App] Waiting for user authentication before navigating..."
        );
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
        console.log(
          `[App] Already on target page: ${targetPath}, clearing pending URL`
        );
        sessionStorage.removeItem("pending_notification_url");
        return;
      }

      // Small delay to ensure app is fully ready and routes are loaded
      await new Promise((resolve) => setTimeout(resolve, 800));

      console.log(
        `[App] Navigating to pending notification URL: ${pendingUrl}`
      );
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

  //
  // ▼▼▼ THIS IS THE FIX (Part 2) ▼▼▼
  //
  useEffect(() => {
    // If we find a user, register their device for notifications
    if (user) {
      console.log(`[App] User ${user.id} found, registering for push...`);
      registerDeviceForNotifications(user.id); // 👈 This will now work
    }
  }, [user]); // 👈 This runs every time 'user' is loaded
  //
  // ▲▲▲ END OF FIX ▲▲▲
  //

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
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/trust-safety" element={<TrustSafety />} />
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
      {/* Native app sticky footer bar for safe area */}
      <div className="native-footer-bar" />
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
