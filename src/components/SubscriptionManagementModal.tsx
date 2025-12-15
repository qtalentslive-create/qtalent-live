import { useState } from "react";
import { Crown, Calendar, CreditCard, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";

interface SubscriptionManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionData?: {
    isProSubscriber: boolean;
    subscriptionStatus: string;
    planId?: string;
    currentPeriodEnd?: string;
    subscriptionStartedAt?: string;
    paypal_subscription_id?: string;
    provider?: string; // 'paypal' or 'manual'
    manualGrantExpiresAt?: string;
    grantedByAdminId?: string;
  };
}

export function SubscriptionManagementModal({
  open,
  onOpenChange,
  subscriptionData,
}: SubscriptionManagementModalProps) {
  const { toast } = useToast();
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const isNativeApp = Capacitor.isNativePlatform();

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateDaysRemaining = (endDate?: string) => {
    if (!endDate) return 0;
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const calculateProgress = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();

    const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const daysUsed =
      (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    return Math.min(100, Math.max(0, (daysUsed / totalDays) * 100));
  };

  const daysRemaining = calculateDaysRemaining(
    subscriptionData?.currentPeriodEnd
  );
  const progress = calculateProgress(
    subscriptionData?.subscriptionStartedAt,
    subscriptionData?.currentPeriodEnd
  );
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;

  const handleCancelSubscription = () => {
    // On native apps, direct users to cancel from desktop website
    if (isNativeApp) {
      toast({
        title: "Cancel from Desktop",
        description:
          "To cancel your subscription, please visit qtalent.live from a desktop browser and go to Manage Subscription.",
        duration: 6000,
      });
      return;
    }

    // Check if subscription was granted by admin
    const isAdminGranted =
      subscriptionData?.grantedByAdminId ||
      subscriptionData?.provider === "manual";

    if (isAdminGranted) {
      toast({
        title: "Cannot Cancel Subscription",
        description:
          "You were granted Pro by an admin and cannot cancel this subscription. Please contact support if you have questions.",
        variant: "default",
        duration: 5000,
      });
      return;
    }

    // Check if PayPal subscription ID exists
    if (!subscriptionData?.paypal_subscription_id) {
      toast({
        title: "Error",
        description: "Subscription ID not found. Cannot cancel.",
        variant: "destructive",
      });
      return;
    }

    // Instead of redirecting, open our own confirmation dialog
    setIsConfirmingCancel(true);
  };

  const executeCancellation = async () => {
    // Double-check admin grant before executing
    const isAdminGranted =
      subscriptionData?.grantedByAdminId ||
      subscriptionData?.provider === "manual";

    if (isAdminGranted) {
      toast({
        title: "Cannot Cancel Subscription",
        description:
          "You were granted Pro by an admin and cannot cancel this subscription.",
        variant: "default",
        duration: 5000,
      });
      setIsConfirmingCancel(false);
      return;
    }

    if (!subscriptionData?.paypal_subscription_id) {
      toast({
        title: "Error",
        description: "Subscription ID not found. Cannot cancel.",
        variant: "destructive",
      });
      setIsConfirmingCancel(false);
      return;
    }

    setIsCancelling(true);

    try {
      console.log(
        "[CancelSub] Starting cancellation for:",
        subscriptionData.paypal_subscription_id
      );

      // Check if user has a valid session first
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error(
          "Your session has expired. Please sign in again and try again."
        );
      }

      console.log("[CancelSub] Session valid, user:", session.user.id);

      // Add timeout to prevent infinite hang
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), 30000)
      );

      const invokePromise = supabase.functions.invoke(
        "cancel-paypal-subscription",
        {
          body: { subscriptionId: subscriptionData.paypal_subscription_id },
        }
      );

      const { data, error } = (await Promise.race([
        invokePromise,
        timeoutPromise,
      ])) as any;

      console.log("[CancelSub] Response:", { data, error });

      if (error) {
        console.error("[CancelSub] Error from function:", error);
        throw new Error(error.message || "Cancellation failed");
      }

      // Check if response indicates failure
      if (data && data.success === false) {
        throw new Error(data.error || "Cancellation failed");
      }

      toast({
        title: "Cancellation Request Sent",
        description:
          "Your subscription will be cancelled shortly. You'll retain Pro access until the end of your billing period.",
      });
      // The webhook will handle the database update. We can close the modal optimistically.
      onOpenChange(false);
    } catch (error: any) {
      console.error("[CancelSub] Cancellation failed:", error);
      toast({
        title: "Cancellation Failed",
        description:
          error?.message ||
          "We couldn't cancel your subscription. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
      setIsConfirmingCancel(false);
    }
  };

  const getPlanDisplayName = (planId?: string) => {
    if (!planId) return "Pro Plan";
    if (planId.toLowerCase().includes("month")) return "Monthly Pro";
    if (planId.toLowerCase().includes("year")) return "Yearly Pro";
    return "Pro Plan";
  };

  const benefits = [
    {
      icon: "📸",
      title: "10 Gallery Photos",
      description: "Showcase your work with a professional portfolio",
    },
    {
      icon: "🎵",
      title: "SoundCloud Integration",
      description: "Link your music directly to your profile",
    },
    {
      icon: "📺",
      title: "YouTube Integration",
      description: "Embed your performance videos",
    },
    {
      icon: "⭐",
      title: "Priority Listing",
      description: "Appear at the top of search results",
    },
    {
      icon: "🚀",
      title: "Unlimited Bookings",
      description: "Accept as many gigs as you want",
    },
    {
      icon: "💬",
      title: "Priority Support",
      description: "Get faster help when you need it",
    },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "max-w-2xl max-h-[90vh] overflow-y-auto",
            isNativeApp &&
              "max-w-full mx-0 rounded-t-[28px] p-0 h-[92vh] max-h-[92vh] flex flex-col bg-background shadow-2xl"
          )}
        >
          {/* Native-style drag handle */}
          {isNativeApp && (
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            </div>
          )}

          <DialogHeader
            className={cn(
              isNativeApp &&
                "pb-3 pt-4 px-5 border-b border-border/30 bg-background"
            )}
          >
            <DialogTitle
              className={cn(
                "flex items-center gap-2",
                isNativeApp ? "text-xl font-bold tracking-tight" : "text-xl"
              )}
            >
              <Crown
                className={cn(
                  "h-5 w-5 text-brand-warning",
                  isNativeApp && "h-6 w-6"
                )}
              />
              Subscription Management
            </DialogTitle>
          </DialogHeader>

          <div
            className={cn(
              "space-y-6 py-4",
              isNativeApp && "flex-1 overflow-y-auto px-5 pb-6 pt-4 space-y-5"
            )}
          >
            {subscriptionData?.isProSubscriber ? (
              <>
                {/* Cards for plan, benefits, etc. remain the same */}
                <Card
                  className={cn(
                    "border-brand-accent/20 bg-gradient-to-br from-brand-accent/5 to-transparent",
                    isNativeApp ? "p-5 rounded-2xl border-2 shadow-lg" : "p-6"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-between",
                      isNativeApp ? "mb-4" : "mb-4"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "bg-brand-accent/10 rounded-lg",
                          isNativeApp ? "p-2.5" : "p-2"
                        )}
                      >
                        <Crown
                          className={cn(
                            "text-brand-accent",
                            isNativeApp ? "h-5 w-5" : "h-5 w-5"
                          )}
                        />
                      </div>
                      <div>
                        <h3
                          className={cn(
                            "font-semibold",
                            isNativeApp ? "text-base tracking-tight" : "text-lg"
                          )}
                        >
                          {getPlanDisplayName(subscriptionData.planId)}
                        </h3>
                        <p
                          className={cn(
                            "text-muted-foreground",
                            isNativeApp ? "text-xs" : "text-sm"
                          )}
                        >
                          $0.25/month • Active
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        "bg-brand-success text-background",
                        isNativeApp && "text-xs px-2 py-0.5"
                      )}
                    >
                      Active
                    </Badge>
                  </div>
                  <div
                    className={cn("space-y-3", isNativeApp && "space-y-2.5")}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-between",
                        isNativeApp ? "text-xs" : "text-sm"
                      )}
                    >
                      <span className="text-muted-foreground">
                        Billing cycle progress
                      </span>
                      <span className="font-medium">
                        {daysRemaining} days remaining
                      </span>
                    </div>
                    <Progress
                      value={progress}
                      className={cn("h-2", isNativeApp && "h-1.5")}
                    />
                    <div
                      className={cn(
                        "flex items-center justify-between text-muted-foreground",
                        isNativeApp ? "text-[10px] leading-tight" : "text-xs"
                      )}
                    >
                      <span>
                        Started:{" "}
                        {formatDate(subscriptionData.subscriptionStartedAt)}
                      </span>
                      <span>
                        Next billing:{" "}
                        {formatDate(subscriptionData.currentPeriodEnd)}
                      </span>
                    </div>
                  </div>
                  {isExpiringSoon && (
                    <div
                      className={cn(
                        "mt-4 p-3 bg-brand-warning/10 border border-brand-warning/20 rounded-lg flex items-center gap-2",
                        isNativeApp && "mt-3 p-2.5 rounded-xl"
                      )}
                    >
                      <AlertTriangle
                        className={cn(
                          "text-brand-warning",
                          isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4"
                        )}
                      />
                      <span
                        className={cn(
                          isNativeApp ? "text-xs leading-relaxed" : "text-sm"
                        )}
                      >
                        Your subscription renews in {daysRemaining} days
                      </span>
                    </div>
                  )}
                </Card>
                <Card
                  className={cn(
                    isNativeApp ? "p-5 rounded-2xl shadow-lg" : "p-6"
                  )}
                >
                  <h4
                    className={cn(
                      "font-semibold mb-4 flex items-center gap-2",
                      isNativeApp ? "text-base" : ""
                    )}
                  >
                    <CreditCard
                      className={cn(isNativeApp ? "h-4 w-4" : "h-4 w-4")}
                    />{" "}
                    Your Pro Benefits
                  </h4>
                  <div
                    className={cn(
                      "grid gap-3",
                      isNativeApp
                        ? "grid-cols-1 gap-2.5"
                        : "grid-cols-1 md:grid-cols-2"
                    )}
                  >
                    {benefits.map((benefit, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center gap-3 bg-secondary/50 rounded-lg",
                          isNativeApp ? "p-2.5 rounded-xl" : "p-3"
                        )}
                      >
                        <span
                          className={cn(isNativeApp ? "text-base" : "text-lg")}
                        >
                          {benefit.icon}
                        </span>
                        <div>
                          <p
                            className={cn(
                              "font-medium",
                              isNativeApp ? "text-xs" : "text-sm"
                            )}
                          >
                            {benefit.title}
                          </p>
                          <p
                            className={cn(
                              "text-muted-foreground",
                              isNativeApp
                                ? "text-[10px] leading-tight"
                                : "text-xs"
                            )}
                          >
                            {benefit.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card
                  className={cn(
                    isNativeApp ? "p-5 rounded-2xl shadow-lg" : "p-6"
                  )}
                >
                  <h4
                    className={cn(
                      "font-semibold mb-4 flex items-center gap-2",
                      isNativeApp ? "text-base" : ""
                    )}
                  >
                    <Calendar
                      className={cn(isNativeApp ? "h-4 w-4" : "h-4 w-4")}
                    />{" "}
                    Manage Subscription
                  </h4>
                  <div className={cn("space-y-4", isNativeApp && "space-y-3")}>
                    {/* Check if subscription was granted by admin */}
                    {subscriptionData?.grantedByAdminId ||
                    subscriptionData?.provider === "manual" ? (
                      <div
                        className={cn(
                          "flex items-start gap-3 bg-primary/10 border-2 border-primary/20 rounded-lg",
                          isNativeApp ? "p-3 rounded-xl" : "p-4"
                        )}
                      >
                        <Crown
                          className={cn(
                            "text-brand-warning mt-0.5 flex-shrink-0",
                            isNativeApp ? "h-4 w-4" : "h-5 w-5"
                          )}
                        />
                        <div className="flex-1">
                          <p
                            className={cn(
                              "font-medium mb-1 text-foreground",
                              isNativeApp ? "text-xs" : "text-sm"
                            )}
                          >
                            Admin-Granted Pro Subscription
                          </p>
                          <p
                            className={cn(
                              "text-muted-foreground",
                              isNativeApp
                                ? "text-[10px] leading-relaxed"
                                : "text-xs"
                            )}
                          >
                            You were granted Pro by an admin and cannot cancel
                            this subscription. Please contact support if you
                            have questions.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className={cn(
                            "flex items-start gap-3 bg-secondary/30 rounded-lg",
                            isNativeApp ? "p-3 rounded-xl" : "p-4"
                          )}
                        >
                          <AlertTriangle
                            className={cn(
                              "text-brand-warning mt-0.5",
                              isNativeApp ? "h-4 w-4" : "h-5 w-5"
                            )}
                          />
                          <div className="flex-1">
                            <p
                              className={cn(
                                "font-medium mb-1",
                                isNativeApp ? "text-xs" : "text-sm"
                              )}
                            >
                              Cancellation Policy
                            </p>
                            <p
                              className={cn(
                                "text-muted-foreground",
                                isNativeApp
                                  ? "text-[10px] leading-relaxed"
                                  : "text-xs"
                              )}
                            >
                              If you cancel, you'll keep Pro access until{" "}
                              {formatDate(subscriptionData.currentPeriodEnd)}.
                              After that, your account will revert to the free
                              plan.
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          onClick={handleCancelSubscription}
                          className={cn(
                            "w-full",
                            isNativeApp &&
                              "h-12 text-base font-semibold rounded-xl shadow-md active:scale-[0.98] transition-transform"
                          )}
                        >
                          Cancel Subscription
                        </Button>
                        <p
                          className={cn(
                            "text-muted-foreground text-center",
                            isNativeApp
                              ? "text-[10px] leading-tight"
                              : "text-xs"
                          )}
                        >
                          Your subscription will be cancelled via PayPal.
                        </p>
                      </>
                    )}
                  </div>
                </Card>
              </>
            ) : (
              <Card
                className={cn(
                  "text-center",
                  isNativeApp ? "p-5 rounded-2xl shadow-lg" : "p-6"
                )}
              >
                <Crown
                  className={cn(
                    "text-muted-foreground mx-auto mb-4",
                    isNativeApp ? "h-10 w-10" : "h-12 w-12"
                  )}
                />
                <h3
                  className={cn(
                    "font-semibold mb-2",
                    isNativeApp ? "text-base" : "text-lg"
                  )}
                >
                  No Active Subscription
                </h3>
                <p
                  className={cn(
                    "text-muted-foreground mb-4",
                    isNativeApp ? "text-sm leading-relaxed" : ""
                  )}
                >
                  You don't have an active Pro subscription. Upgrade to unlock
                  all Pro features!
                </p>
                <Button
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    isNativeApp && "h-12 text-base font-semibold rounded-xl"
                  )}
                >
                  Close
                </Button>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isConfirmingCancel}
        onOpenChange={setIsConfirmingCancel}
      >
        <AlertDialogContent
          className={cn(
            isNativeApp && "max-w-[calc(100vw-2rem)] mx-4 rounded-2xl"
          )}
        >
          <AlertDialogHeader>
            <AlertDialogTitle
              className={cn(isNativeApp && "text-lg font-bold")}
            >
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription
              className={cn(isNativeApp && "text-sm leading-relaxed")}
            >
              This will cancel your Pro subscription. You will retain Pro access
              until the end of your current billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter
            className={cn(isNativeApp && "flex-col gap-2 sm:flex-row")}
          >
            <AlertDialogCancel
              className={cn(
                isNativeApp &&
                  "w-full sm:w-auto h-11 text-base font-semibold rounded-xl"
              )}
            >
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeCancellation}
              disabled={isCancelling}
              className={cn(
                isNativeApp &&
                  "w-full sm:w-auto h-11 text-base font-semibold rounded-xl active:scale-[0.98] transition-transform"
              )}
            >
              {isCancelling ? "Cancelling..." : "Yes, Cancel Subscription"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
