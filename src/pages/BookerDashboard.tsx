import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth"; // Make sure this hook exports 'isLoading'
import { LogOut, ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { BookerDashboardTabs } from "@/components/BookerDashboardTabs";
import { UniversalChat } from "@/components/UniversalChat";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import PullToRefresh from "react-simple-pull-to-refresh";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";

const BookerDashboard = () => {
  const { user, signOut, loading } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const isNativeApp = Capacitor.isNativePlatform();

  const navigate = useNavigate();

  const handleRefresh = async () => {
    setRefreshKey(prev => prev + 1);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  // Enable real-time notifications
  useRealtimeNotifications();

  // ProtectedRoute handles authentication redirects - no need to duplicate here
  useEffect(() => {
    if (!loading && !user) {
      console.warn("[BookerDashboard] No user found, ProtectedRoute should handle redirect");
    }
  }, [user, loading]);

  // Cleanup expired bookings (this is fine, but let's add a check)
  useEffect(() => {
    const cleanupExpired = async () => {
      try {
        const { error } = await supabase.functions.invoke("cleanup-expired-bookings");
        if (error) console.error("Cleanup error:", error);
      } catch (err) {
        console.error("Failed to cleanup expired bookings:", err);
      }
    };

    // Only run cleanup if the user is loaded
    if (user) {
      cleanupExpired();
    }
  }, [user]); // This useEffect is just for cleanup

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {/* Use a consistent spinner */}
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  // --- If we get here, isLoading is false AND we have a user ---

  return (
    <div className="min-h-screen bg-background">
      <Header /> {/* Keep main header */}
      {isNativeApp ? (
        <div className="w-full px-4 pt-20 pb-[calc(5rem+env(safe-area-inset-bottom))]">
          {/* Back to Home Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4 h-10 text-sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          
          {/* Header */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold gradient-text">
                  Welcome, {user?.email?.split("@")[0] || "Guest"}!
                </h1>
                <p className="text-muted-foreground text-xs">Manage your event bookings</p>
              </div>

              {/* Notification Center - Desktop */}
              <div className="hidden sm:flex items-center gap-2">
                <NotificationCenter />
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2 dashboard-buttons">
                <Button
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="flex-shrink-0 h-9 px-3 text-sm border border-blue-500/40 hover:bg-blue-500/10"
                  size="default"
                >
                  Browse Talents
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/your-event")}
                  className="flex-shrink-0 h-9 px-3 text-sm border border-green-500/40 hover:bg-green-500/10"
                  size="default"
                >
                  Tell us about your event
                </Button>
              </div>

              {/* Notification Center - Mobile */}
              <div className="sm:hidden self-start">
                <NotificationCenter />
              </div>
            </div>
          </div>

          {/* Tabbed Dashboard */}
          <BookerDashboardTabs userId={user.id} key={refreshKey} />
        </div>
      ) : (
        <PullToRefresh onRefresh={handleRefresh}>
          {/* Fix: Add proper padding-top for fixed header */}
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
            {/* Back to Home Button */}
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            
            {/* Header */}
            <div className="flex flex-col gap-4 mb-6 lg:mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">
                    Welcome, {user?.email?.split("@")[0] || "Guest"}!
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base">Manage your event bookings</p>
                </div>

                {/* Notification Center - Desktop */}
                <div className="hidden sm:flex items-center gap-2">
                  <NotificationCenter />
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="flex flex-wrap gap-2 flex-1 dashboard-buttons">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/")}
                    className="flex-shrink-0 border-2 border-blue-500 hover:bg-blue-500/10 hover:border-blue-600 transition-all"
                    size="default"
                  >
                    Browse Talents
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/your-event")}
                    className="flex-shrink-0 border-2 border-green-500 hover:bg-green-500/10 hover:border-green-600 transition-all"
                    size="default"
                  >
                    Tell us about your event
                  </Button>
                  {/* Hide Sign Out in Capacitor - it's in the menu */}
                  <Button 
                    variant="outline" 
                    onClick={handleSignOut} 
                    size="sm"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Sign Out</span>
                    <span className="sm:hidden">Logout</span>
                  </Button>
                </div>

                {/* Notification Center - Mobile */}
                <div className="sm:hidden self-start">
                  <NotificationCenter />
                </div>
              </div>
            </div>

            {/* Tabbed Dashboard */}
            <BookerDashboardTabs userId={user.id} key={refreshKey} />
          </div>
        </PullToRefresh>
      )}
    </div>
  );
};

export default BookerDashboard;