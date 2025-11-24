import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";

interface EventRequestStatsProps {
  userId: string;
}

export function EventRequestStats({ userId }: EventRequestStatsProps) {
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [declinedCount, setDeclinedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const isNativeApp = Capacitor.isNativePlatform();

  useEffect(() => {
    const fetchStats = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch all event requests (no date filter for stats)
        const { data: allRequests, error } = await supabase
          .from("event_requests")
          .select("accepted_by_talents, declined_by_talents");

        if (error) {
          console.error("Error fetching event request stats:", error);
          return;
        }

        // Count accepted and declined
        let accepted = 0;
        let declined = 0;

        allRequests?.forEach((request) => {
          if (request.accepted_by_talents?.includes(userId)) {
            accepted++;
          }
          if (request.declined_by_talents?.includes(userId)) {
            declined++;
          }
        });

        setAcceptedCount(accepted);
        setDeclinedCount(declined);
      } catch (error) {
        console.error("Error calculating stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("event-request-stats")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_requests",
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (loading) {
    return (
      <div className={cn(
        "grid gap-2",
        isNativeApp ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2"
      )}>
        {[1, 2].map((i) => (
          <div key={i} className={cn(
            "rounded-md border border-border/50 bg-card/50",
            isNativeApp ? "p-2.5" : "p-3"
          )}>
            <div className="flex items-center justify-center h-12">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn(
      "grid gap-2",
      isNativeApp ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2"
    )}>
      {/* Accepted Card */}
      <div className={cn(
        "rounded-md border border-border/50 bg-card/50 transition-colors",
        isNativeApp ? "p-2.5" : "p-3"
      )}>
        <div className="flex items-center justify-between mb-1.5">
          <span className={cn(
            "text-xs font-normal text-muted-foreground",
            isNativeApp && "text-[10px]"
          )}>
            Accepted
          </span>
          <CheckCircle2 className={cn(
            "h-3 w-3 text-muted-foreground/60",
            isNativeApp && "h-2.5 w-2.5"
          )} />
        </div>
        <div className={cn(
          "font-semibold text-foreground",
          isNativeApp ? "text-base" : "text-lg"
        )}>
          {acceptedCount}
        </div>
      </div>

      {/* Declined Card */}
      <div className={cn(
        "rounded-md border border-border/50 bg-card/50 transition-colors",
        isNativeApp ? "p-2.5" : "p-3"
      )}>
        <div className="flex items-center justify-between mb-1.5">
          <span className={cn(
            "text-xs font-normal text-muted-foreground",
            isNativeApp && "text-[10px]"
          )}>
            Declined
          </span>
          <XCircle className={cn(
            "h-3 w-3 text-muted-foreground/60",
            isNativeApp && "h-2.5 w-2.5"
          )} />
        </div>
        <div className={cn(
          "font-semibold text-foreground",
          isNativeApp ? "text-base" : "text-lg"
        )}>
          {declinedCount}
        </div>
      </div>
    </div>
  );
}

