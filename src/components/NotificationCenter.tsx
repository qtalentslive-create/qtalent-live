// FILE: src/components/NotificationCenter.tsx

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/contexts/ChatContext";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type: string;
  booking_id?: string;
  event_request_id?: string;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const { openChat } = useChat();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const containerRef = useRef<HTMLDivElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Allow external trigger to open the popover
  useEffect(() => {
    const handler = () => {
      setPopoverOpen(true);
    };
    // Use a custom event name unlikely to collide
    window.addEventListener("openNotificationsPopover", handler as EventListener);
    return () => {
      window.removeEventListener("openNotificationsPopover", handler as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          console.error("Error fetching notifications:", error);
          toast({
            title: "Error Loading Notifications",
            description: error.message,
            variant: "destructive",
          });
        } else {
          setNotifications(data || []);
        }
      } catch (error) {
        console.error("Unexpected error fetching notifications:", error);
      }
    };

    fetchNotifications();

    const subscription = supabase
      .channel(`notifications-for-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, toast]);

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true }))
      );

      toast({
        title: "All notifications marked as read",
        description: "You're all caught up!",
      });
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Close popover first
    setPopoverOpen(false);
    
    // Mark as read in the database
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notification.id);

    // Update state locally to immediately reflect the change
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
    );

    // Check user role to determine dashboard
    const { data: talentProfile } = await supabase
      .from("talent_profiles")
      .select("id")
      .eq("user_id", user?.id)
      .maybeSingle();

    const isTalent = !!talentProfile;
    const dashboardPath = isTalent ? "/talent-dashboard" : "/booker-dashboard";

    // Handle navigation based on notification type
    if (notification.type === "new_message") {
      // NEW MESSAGE: Navigate to dashboard and OPEN CHATBOX
      navigate(dashboardPath);

      // Open chat for booking or event request
      if (notification.booking_id) {
        setTimeout(() => {
          openChat(notification.booking_id!, "booking");
        }, 500);
      } else if (notification.event_request_id) {
        setTimeout(() => {
          openChat(notification.event_request_id!, "event_request");
        }, 500);
      }
    } else if (
      notification.type === "booking" ||
      notification.type === "booking_status"
    ) {
      // NEW BOOKING REQUEST or STATUS CHANGE: Navigate to dashboard (show cards, don't open chat)
      navigate(dashboardPath);
      // User will see the booking cards on the dashboard - no chat opens
    } else if (
      notification.event_request_id &&
      notification.type !== "new_message"
    ) {
      // EVENT REQUEST (not a message): Navigate to dashboard (show cards, don't open chat)
      navigate(dashboardPath);
      // User will see the event request cards on the dashboard - no chat opens
    } else {
      // Fallback: Just navigate to dashboard
      navigate(dashboardPath);
    }
  };


  return (
    <div ref={containerRef}>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className="relative"
          >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex min-w-[18px] h-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white px-1.5">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn(
          "w-80",
          Capacitor.isNativePlatform() && "w-[320px] p-0 notification-popover-native"
        )}
        side="bottom"
        align="end"
        onInteractOutside={(e) => {
          // Prevent closing when clicking inside notification items
          const target = e.target as HTMLElement;
          if (target.closest('.notification-item') || target.closest('.notification-item-native')) {
            e.preventDefault();
          }
        }}
      >
        <div className={cn(
          "p-4",
          Capacitor.isNativePlatform() && "p-2"
        )}>
          <div className={cn(
            "flex items-center justify-between mb-4",
            Capacitor.isNativePlatform() && "mb-2"
          )}>
            <h4 className={cn(
              "font-medium leading-none",
              Capacitor.isNativePlatform() && "text-xs font-semibold"
            )}>Notifications</h4>
            {notifications.length > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="ghost"
                size="sm"
                className={cn(
                  "text-xs text-muted-foreground hover:text-foreground h-auto py-1 px-2",
                  Capacitor.isNativePlatform() && "text-[9px] py-0.5 px-1 h-5 font-normal"
                )}
                disabled={unreadCount === 0}
              >
                <CheckCheck className={cn(
                  "h-3 w-3 mr-1",
                  Capacitor.isNativePlatform() && "h-2 w-2 mr-0.5"
                )} />
                Mark all read
              </Button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className={cn(
              "text-sm text-muted-foreground",
              Capacitor.isNativePlatform() && "text-[11px]"
            )}>
              No new notifications.
            </p>
          ) : (
            <div className={cn(
              "space-y-2 max-h-96 overflow-y-auto",
              Capacitor.isNativePlatform() && "space-y-1 max-h-[65vh]"
            )}>
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNotificationClick(n);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNotificationClick(n);
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-md cursor-pointer transition-colors border notification-item",
                    Capacitor.isNativePlatform() && "p-2 rounded-lg notification-item-native",
                    n.is_read
                      ? "hover:bg-muted/50 border-transparent bg-transparent"
                      : "bg-primary/10 hover:bg-primary/20 border-primary/20 active:bg-primary/30"
                  )}
                  style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}
                >
                  {n.title && (
                    <p className={cn(
                      "text-sm font-semibold mb-1 notification-title",
                      Capacitor.isNativePlatform() && "text-xs font-medium mb-1 leading-tight notification-title-native"
                    )}>{n.title}</p>
                  )}
                  <p
                    className={cn(
                      "text-sm notification-message",
                      Capacitor.isNativePlatform() && "text-xs leading-relaxed notification-message-native",
                      n.title 
                        ? "text-muted-foreground" 
                        : "font-medium"
                    )}
                  >
                    {n.message}
                  </p>
                  <p className={cn(
                    "text-xs text-muted-foreground mt-1 notification-time",
                    Capacitor.isNativePlatform() && "text-[10px] mt-1 notification-time-native"
                  )}>
                    {formatDistanceToNow(new Date(n.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
    </div>
  );
}
