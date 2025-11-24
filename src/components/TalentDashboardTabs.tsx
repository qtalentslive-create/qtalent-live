// FILE: src/components/TalentDashboardTabs.tsx

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingCard, Booking } from "./BookingCard"; // THE FIX: Import the strict Booking interface
import { EventRequestCard, EventRequest } from "./EventRequestCard"; // THE FIX: Import the strict EventRequest interface
import { useTalentBookingLimit } from "@/hooks/useTalentBookingLimit";
import { useRealtimeBookings } from "@/hooks/useRealtimeBookings";
import { useRealtimeEventRequests } from "@/hooks/useRealtimeEventRequests";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";

interface TalentProfile {
  id: string;
  location?: string;
  is_pro_subscriber?: boolean;
  artist_name?: string;
  user_id?: string;
  // Allow any additional properties from the actual talent profile
  [key: string]: any;
}

interface TalentDashboardTabsProps {
  profile: TalentProfile;
  focusBookingId?: string | null;
  focusEventRequestId?: string | null;
  onFocusHandled?: (type: "booking" | "event") => void;
}

export const TalentDashboardTabs = ({
  profile,
  focusBookingId,
  focusEventRequestId,
  onFocusHandled,
}: TalentDashboardTabsProps) => {
  const [directBookings, setDirectBookings] = useState<Booking[]>([]);
  const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { receivedBookingsThisMonth, isProUser } = useTalentBookingLimit();
  const isNativeApp = Capacitor.isNativePlatform();

  const fetchData = useCallback(async () => {
    if (!profile || !profile.id) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // CHROME CACHE BUST: Add timestamp to force fresh data in Chrome
    const timestamp = Date.now();
    const cacheBuster = `?_t=${timestamp}`;

    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings_secure")
      .select(`*, talent_profiles(artist_name)`)
      .eq("talent_id", profile.id)
      .order("event_date", { ascending: false });

    if (bookingsError) {
      console.error("Error fetching direct bookings:", bookingsError.message);
    } else {
      setDirectBookings((bookingsData as Booking[]) || []);
    }

    if (profile.location && profile.user_id) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Build query with talent type matching
      let query = supabase
        .from("event_requests")
        .select("*")
        .eq("event_location", profile.location)
        .gte("event_date", today.toISOString().split("T")[0])
        .not("hidden_by_talents", "cs", `{${profile.user_id}}`)
        .not("declined_by_talents", "cs", `{${profile.user_id}}`);

      // Filter by talent type if specified in request (case-insensitive)
      if (profile.act) {
        query = query.ilike("talent_type_needed", profile.act);
      }

      const { data: requestsData, error: requestsError } = await query.order(
        "created_at",
        { ascending: false }
      );

      if (requestsError) {
        console.error(
          "Error fetching matching event requests:",
          requestsError.message
        );
      } else {
        setEventRequests((requestsData as EventRequest[]) || []);
      }
    }

    setLoading(false);
  }, [profile]);

  // Handle immediate removal from local state when booking is deleted
  const handleBookingRemove = useCallback((bookingId: string) => {
    setDirectBookings((prev) =>
      prev.filter((booking) => booking.id !== bookingId)
    );
  }, []);

  const handleEventRequestRemove = useCallback((requestId: string) => {
    setEventRequests((prev) =>
      prev.filter((request) => request.id !== requestId)
    );
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Enable realtime updates for bookings and event requests
  useRealtimeBookings(fetchData);
  useRealtimeEventRequests(fetchData);

  // Auto-scroll to show all cards after data loads and on tab change (especially for native apps)
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = React.useState("direct_bookings");

  const highlightCard = useCallback(
    (elementId: string, type: "booking" | "event") => {
      const element = document.getElementById(elementId);
      if (!element) return;

      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

      // Add highlight class to card
      element.classList.add("card-focus-highlight");

      // Also add highlight class to buttons inside the card (especially Accept/Decline buttons)
      const buttons = element.querySelectorAll("button:not(:disabled)");
      buttons.forEach((btn) => {
        btn.classList.add("button-focus-highlight");
      });

      const clearHighlight = () => {
        element.classList.remove("card-focus-highlight");
        buttons.forEach((btn) => {
          btn.classList.remove("button-focus-highlight");
        });
      };

      // Clear after 4.5 seconds (3 pulses × 1.5s)
      if (typeof window !== "undefined") {
        window.setTimeout(clearHighlight, 4500);
      } else {
        setTimeout(clearHighlight, 4500);
      }

      onFocusHandled?.(type);
    },
    [onFocusHandled]
  );

  const scrollToShowAllCards = React.useCallback(() => {
    // More powerful scroll: scroll to bottom of page to show all content
    const scrollToBottom = () => {
      const scrollContainer = document.documentElement || document.body;
      const scrollHeight = scrollContainer.scrollHeight;
      const clientHeight = scrollContainer.clientHeight;

      // Only scroll if content extends beyond viewport
      if (scrollHeight > clientHeight) {
        window.scrollTo({
          top: scrollHeight - clientHeight,
          behavior: "smooth",
        });
      }
    };

    // Wait a bit for layout to settle, then scroll to bottom
    const timer = setTimeout(() => {
      scrollToBottom();
      // Also try scrolling the current tab content
      if (tabsContainerRef.current) {
        const currentTab =
          tabsContainerRef.current.querySelector(
            '[role="tabpanel"][data-state="active"]'
          ) || tabsContainerRef.current.querySelector('[role="tabpanel"]');
        if (currentTab) {
          const cards = currentTab.querySelectorAll(
            'div[class*="rounded"], [class*="Card"], [class*="card"]'
          );
          if (cards.length > 0) {
            const lastCard = cards[cards.length - 1] as HTMLElement;
            if (lastCard) {
              // Ensure last card is visible by scrolling it into view as well
              lastCard.scrollIntoView({
                behavior: "smooth",
                block: "end",
                inline: "nearest",
              });
            }
          }
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll when data loads
  useEffect(() => {
    if (!loading && (directBookings.length > 0 || eventRequests.length > 0)) {
      // Wait for cards to render, then scroll smoothly to show all cards
      const timer = setTimeout(() => {
        scrollToShowAllCards();
      }, 500); // Wait 500ms for cards to fully render

      return () => clearTimeout(timer);
    }
  }, [
    loading,
    directBookings.length,
    eventRequests.length,
    scrollToShowAllCards,
  ]);

  // Auto-scroll when tab changes
  useEffect(() => {
    if (!loading && (directBookings.length > 0 || eventRequests.length > 0)) {
      const timer = setTimeout(() => {
        scrollToShowAllCards();
      }, 300); // Wait 300ms for tab transition to complete

      return () => clearTimeout(timer);
    }
  }, [
    activeTab,
    loading,
    directBookings.length,
    eventRequests.length,
    scrollToShowAllCards,
  ]);

  useEffect(() => {
    if (!focusBookingId || loading) {
      return;
    }

    const exists = directBookings.some(
      (booking) => booking.id === focusBookingId
    );

    if (exists) {
      // Switch tab immediately
      setActiveTab("direct_bookings");
      // Wait for tab content to render, then highlight
      const timer = setTimeout(() => {
        highlightCard(`booking-${focusBookingId}`, "booking");
      }, 800); // Increased delay to ensure tab content is fully rendered
      return () => clearTimeout(timer);
    } else if (directBookings.length > 0) {
      // Booking not found after data loaded
      onFocusHandled?.("booking");
    }
  }, [
    focusBookingId,
    directBookings,
    directBookings.length,
    loading,
    highlightCard,
    onFocusHandled,
  ]);

  useEffect(() => {
    if (!focusEventRequestId || loading) {
      return;
    }

    const exists = eventRequests.some(
      (request) => request.id === focusEventRequestId
    );

    if (exists) {
      // Switch tab immediately
      setActiveTab("event_requests");
      // Wait for tab content to render, then highlight
      const timer = setTimeout(() => {
        highlightCard(`event-request-${focusEventRequestId}`, "event");
      }, 800); // Increased delay to ensure tab content is fully rendered
      return () => clearTimeout(timer);
    } else if (eventRequests.length > 0) {
      // Event request not found after data loaded
      onFocusHandled?.("event");
    }
  }, [
    focusEventRequestId,
    eventRequests,
    eventRequests.length,
    loading,
    highlightCard,
    onFocusHandled,
  ]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">
          Loading Your Opportunities...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full" ref={tabsContainerRef}>
      <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="direct_bookings">
            Direct Bookings ({directBookings.length})
          </TabsTrigger>
          <TabsTrigger value="event_requests">
            Event Requests ({eventRequests.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="direct_bookings"
          className={cn(
            isNativeApp
              ? "pt-3 pb-[calc(4rem+env(safe-area-inset-bottom))]"
              : "pt-4"
          )}
        >
          <div className={cn(isNativeApp ? "space-y-3 w-full" : "space-y-4")}>
            {directBookings.length > 0 ? (
              directBookings.map((b) => {
                // Blur contact details for ALL pending bookings when non-pro talent has reached limit
                const shouldBlurContact =
                  !isProUser &&
                  receivedBookingsThisMonth >= 1 &&
                  b.status === "pending";

                return (
                  <div
                    key={b.id}
                    id={`booking-${b.id}`}
                    className={cn(isNativeApp && "w-full")}
                  >
                    <BookingCard
                      booking={b}
                      mode="talent"
                      onUpdate={fetchData}
                      onRemove={handleBookingRemove}
                      shouldBlurContact={shouldBlurContact}
                    />
                  </div>
                );
              })
            ) : (
              <p
                className={cn(
                  "text-muted-foreground text-center",
                  isNativeApp ? "text-sm py-6" : "py-8"
                )}
              >
                You have not received any direct bookings.
              </p>
            )}
          </div>
        </TabsContent>
        <TabsContent
          value="event_requests"
          className={cn(
            isNativeApp
              ? "pt-3 pb-[calc(4rem+env(safe-area-inset-bottom))]"
              : "pt-4"
          )}
        >
          <div className={cn(isNativeApp ? "space-y-3 w-full" : "space-y-4")}>
            {eventRequests.length > 0 ? (
              eventRequests.map((req) => (
                <div
                  key={req.id}
                  id={`event-request-${req.id}`}
                  className={cn(isNativeApp && "w-full")}
                >
                  <EventRequestCard
                    request={req}
                    isActionable={profile.is_pro_subscriber || false}
                    mode="talent"
                    onRemove={handleEventRequestRemove}
                    currentUserId={profile.user_id}
                  />
                </div>
              ))
            ) : (
              <p
                className={cn(
                  "text-muted-foreground text-center",
                  isNativeApp ? "text-sm py-6" : "py-8"
                )}
              >
                No event requests match your location at this time.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
