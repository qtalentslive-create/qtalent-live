import { useState, useEffect } from "react";
import { Crown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProBadge } from "@/components/ProBadge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { SubscriptionManagementModal } from "@/components/SubscriptionManagementModal";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SubscriptionButtonProps {
  isProSubscriber?: boolean;
  onSubscriptionChange?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

interface SubscriptionData {
  isProSubscriber: boolean;
  subscriptionStatus: string;
  planId?: string;
  currentPeriodEnd?: string;
  subscriptionStartedAt?: string;
  paypal_subscription_id?: string;
  provider?: string; // 'paypal' or 'manual'
  manualGrantExpiresAt?: string;
  grantedByAdminId?: string;
}

export function SubscriptionButton({
  isProSubscriber = false,
  onSubscriptionChange,
  variant = "default",
  size = "default",
  className = "",
}: SubscriptionButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isNativeApp = Capacitor.isNativePlatform();
  const [showModal, setShowModal] = useState(false);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionData | null>(null);

  useEffect(() => {
    if (user && isProSubscriber) {
      fetchSubscriptionData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isProSubscriber]);

  const fetchSubscriptionData = async () => {
    if (!user) return;

    try {
      // Fetch subscription data including provider info
      const { data, error } = await supabase
        .from("talent_profiles")
        .select(
          "is_pro_subscriber, subscription_status, plan_id, current_period_end, subscription_started_at, paypal_subscription_id, provider, manual_grant_expires_at, granted_by_admin_id"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching subscription data:", error);
        return;
      }

      if (data) {
        setSubscriptionData({
          isProSubscriber: data.is_pro_subscriber || false,
          subscriptionStatus: data.subscription_status || "free",
          planId: data.plan_id || undefined,
          currentPeriodEnd: data.current_period_end || undefined,
          subscriptionStartedAt: data.subscription_started_at || undefined,
          paypal_subscription_id: data.paypal_subscription_id || undefined,
          provider: data.provider || "paypal",
          manualGrantExpiresAt: data.manual_grant_expires_at || undefined,
          grantedByAdminId: data.granted_by_admin_id || undefined,
        });
      }
    } catch (error) {
      console.error("Error fetching subscription data:", error);
    }
  };

  const calculateDaysRemaining = (endDate?: string) => {
    if (!endDate) return null;
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const daysRemaining = calculateDaysRemaining(
    subscriptionData?.currentPeriodEnd
  );

  const handleSubscriptionAction = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to manage your subscription.",
        variant: "destructive",
      });
      return;
    }

    if (isProSubscriber) {
      setShowManagementModal(true);
    } else {
      // Open subscription modal directly - works in both web and Capacitor
      setShowModal(true);
    }
  };

  if (isProSubscriber) {
    return (
      <>
        <Button
          variant="outline"
          size={size}
          onClick={handleSubscriptionAction}
          className={cn(
            "relative gap-2 rounded-full border-border/60 text-foreground hover:border-accent hover:text-accent transition-all",
            isNativeApp ? "h-9 px-3 text-sm" : "h-10 px-4",
            className
          )}
        >
          <Settings className={isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4"} />
          <div
            className={`flex ${
              isNativeApp ? "flex-col items-start" : "flex-col items-start"
            }`}
          >
            <span className={isNativeApp ? "text-xs leading-tight" : ""}>
              Manage Pro
            </span>
            {daysRemaining !== null && !isNativeApp && (
              <span className="text-xs opacity-80">
                {daysRemaining} days left
              </span>
            )}
            {daysRemaining !== null && isNativeApp && (
              <span className="text-[10px] opacity-70 leading-tight">
                {daysRemaining}d left
              </span>
            )}
          </div>
          {!isNativeApp && <ProBadge size="sm" showIcon={false} />}
        </Button>

        <SubscriptionManagementModal
          open={showManagementModal}
          onOpenChange={setShowManagementModal}
          subscriptionData={
            subscriptionData
              ? {
                  isProSubscriber: subscriptionData.isProSubscriber,
                  subscriptionStatus: subscriptionData.subscriptionStatus,
                  planId: subscriptionData.planId,
                  currentPeriodEnd: subscriptionData.currentPeriodEnd,
                  subscriptionStartedAt: subscriptionData.subscriptionStartedAt,
                  paypal_subscription_id:
                    subscriptionData.paypal_subscription_id,
                  provider: subscriptionData.provider,
                  manualGrantExpiresAt: subscriptionData.manualGrantExpiresAt,
                  grantedByAdminId: subscriptionData.grantedByAdminId,
                }
              : undefined
          }
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size={size}
        onClick={handleSubscriptionAction}
        className={cn(
          "relative gap-2 rounded-full border-border/60 text-foreground hover:border-accent hover:text-accent transition-all",
          isNativeApp ? "h-9 px-3 text-sm" : "h-12 px-6 text-sm",
          className
        )}
      >
        <Crown
          className={
            isNativeApp
              ? "h-3.5 w-3.5 text-brand-warning"
              : "h-4 w-4 text-brand-warning"
          }
        />
        <span className={isNativeApp ? "text-xs" : ""}>Upgrade to Pro</span>
        {!isNativeApp && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/20 to-brand-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </>
        )}
      </Button>

      <SubscriptionModal open={showModal} onOpenChange={setShowModal} />
    </>
  );
}
