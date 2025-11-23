// FILE: src/pages/TalentDashboard.tsx

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth"; // Make sure this hook exports 'isLoading'
import { LogOut, Edit3, Crown, Eye, ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { TalentDashboardTabs } from "@/components/TalentDashboardTabs";
import { SubscriptionButton } from "@/components/SubscriptionButton";
import { ProBadge } from "@/components/ProBadge";
import { ModeSwitch } from "@/components/ModeSwitch";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import PullToRefresh from "react-simple-pull-to-refresh";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";

const TalentDashboard = () => {
  const { user, profile, signOut, loading } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const isNativeApp = Capacitor.isNativePlatform();
  const [talentName, setTalentName] = useState<string | null>(null);
  const [isProTalent, setIsProTalent] = useState<boolean>(false);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusBookingId = searchParams.get("bookingId");
  const focusEventRequestId = searchParams.get("eventRequestId");

  const clearFocusParam = useCallback(
    (param: "bookingId" | "eventRequestId") => {
      if (searchParams.has(param)) {
        const next = new URLSearchParams(searchParams);
        next.delete(param);
        setSearchParams(next, { replace: true });
      }
    },
    [searchParams, setSearchParams]
  );

  const handleFocusHandled = useCallback(
    (type: "booking" | "event") => {
      if (type === "booking") {
        clearFocusParam("bookingId");
      } else {
        clearFocusParam("eventRequestId");
      }
    },
    [clearFocusParam]
  );

  const handleRefresh = async () => {
    setRefreshKey(prev => prev + 1);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  useRealtimeNotifications();

  // ProtectedRoute handles authentication redirects - no need to duplicate here
  useEffect(() => {
    if (!loading && !user) {
      console.warn("[TalentDashboard] No user found, ProtectedRoute should handle redirect");
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

  // Fetch talent profile for dashboard header
  useEffect(() => {
    if (user && profile) {
      setTalentName(profile.artist_name || null);
      setIsProTalent(profile.is_pro_subscriber || false);
    }
  }, [user, profile]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {/* Use a consistent spinner */}
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  // --- If we get here, isLoading is false AND we have a user/profile ---

  return (
    <div className="min-h-screen">
      <Header /> {/* Keep main header */}
      {isNativeApp ? (
        <div className={cn("w-full px-4 pt-20 pb-[calc(5rem+env(safe-area-inset-bottom))]")}>
          {/* Back to Home Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className={cn("mb-4", "h-10 text-sm")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          
          {/* Header */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-lg font-bold gradient-text">
                    Welcome, {profile.artist_name || "Talent"}!
                  </h1>
                  {profile.is_pro_subscriber && <ProBadge size="sm" />}
                </div>
                <p className="text-muted-foreground text-xs">Manage your bookings and event opportunities</p>
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <NotificationCenter />
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2 dashboard-buttons">
                {/* Keep View Profile visible in Capacitor */}
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/talent/${profile.id}`)} 
                  size="default"
                  className="h-9 px-3 text-sm"
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  View Profile
                </Button>
              </div>

              <div className="sm:hidden self-start">
                <NotificationCenter />
              </div>
            </div>
          </div>

          {/* === NEW TABBED DASHBOARD === */}
          <TalentDashboardTabs
            profile={profile}
            key={refreshKey}
            focusBookingId={focusBookingId}
            focusEventRequestId={focusEventRequestId}
            onFocusHandled={handleFocusHandled}
          />
        </div>
      ) : (
        <PullToRefresh onRefresh={handleRefresh}>
          <div className={cn("container mx-auto px-3 sm:px-4 py-4 sm:py-8")}>
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
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">
                      Welcome, {profile.artist_name || "Talent"}!
                    </h1>
                    {profile.is_pro_subscriber && <ProBadge size="sm" />}
                  </div>
                  <p className="text-muted-foreground text-sm sm:text-base">Manage your bookings and event opportunities</p>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <NotificationCenter />
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="flex flex-wrap gap-2 flex-1 dashboard-buttons">
                  <Button 
                    onClick={() => navigate("/talent-profile-edit")} 
                    size="sm"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <ModeSwitch size="sm" />
                  <Button 
                    variant="outline" 
                    onClick={handleSignOut} 
                    size="sm"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(`/talent/${profile.id}`)} 
                    size="sm"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Profile
                  </Button>
                  <SubscriptionButton 
                    isProSubscriber={profile.is_pro_subscriber || false}
                    size="sm"
                  />
                </div>

                <div className="sm:hidden self-start">
                  <NotificationCenter />
                </div>
              </div>
            </div>

            {/* === NEW TABBED DASHBOARD === */}
            <TalentDashboardTabs
              profile={profile}
              key={refreshKey}
              focusBookingId={focusBookingId}
              focusEventRequestId={focusEventRequestId}
              onFocusHandled={handleFocusHandled}
            />
          </div>
        </PullToRefresh>
      )}
    </div>
  );
};

export default TalentDashboard;
