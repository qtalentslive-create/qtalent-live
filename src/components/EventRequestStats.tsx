import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        "grid gap-3",
        isNativeApp ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2"
      )}>
        {[1, 2].map((i) => (
          <Card key={i} className={cn(isNativeApp ? "p-3" : "p-4")}>
            <div className="flex items-center justify-center h-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn(
      "grid gap-3",
      isNativeApp ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2"
    )}>
      {/* Accepted Card */}
      <Card className={cn(
        "border-primary/20 bg-primary/5",
        isNativeApp ? "p-3" : "p-4"
      )}>
        <CardHeader className={cn(
          "flex flex-row items-center justify-between space-y-0 pb-2",
          isNativeApp && "pb-1.5"
        )}>
          <CardTitle className={cn(
            "text-sm font-medium text-primary",
            isNativeApp && "text-xs"
          )}>
            Accepted
          </CardTitle>
          <CheckCircle2 className={cn(
            "h-4 w-4 text-primary",
            isNativeApp && "h-3.5 w-3.5"
          )} />
        </CardHeader>
        <CardContent>
          <div className={cn(
            "font-bold text-primary",
            isNativeApp ? "text-xl" : "text-2xl"
          )}>
            {acceptedCount}
          </div>
          <p className={cn(
            "text-xs text-muted-foreground mt-1",
            isNativeApp && "text-[10px]"
          )}>
            Event requests accepted
          </p>
        </CardContent>
      </Card>

      {/* Declined Card */}
      <Card className={cn(
        "border-muted-foreground/20",
        isNativeApp ? "p-3" : "p-4"
      )}>
        <CardHeader className={cn(
          "flex flex-row items-center justify-between space-y-0 pb-2",
          isNativeApp && "pb-1.5"
        )}>
          <CardTitle className={cn(
            "text-sm font-medium",
            isNativeApp && "text-xs"
          )}>
            Declined
          </CardTitle>
          <XCircle className={cn(
            "h-4 w-4 text-muted-foreground",
            isNativeApp && "h-3.5 w-3.5"
          )} />
        </CardHeader>
        <CardContent>
          <div className={cn(
            "font-bold",
            isNativeApp ? "text-xl" : "text-2xl"
          )}>
            {declinedCount}
          </div>
          <p className={cn(
            "text-xs text-muted-foreground mt-1",
            isNativeApp && "text-[10px]"
          )}>
            Event requests declined
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

