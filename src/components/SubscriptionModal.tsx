import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { cn } from "@/lib/utils";
import { getReturnDestination } from "@/utils/authNavigation";
import { supabase } from "@/integrations/supabase/client";

//checking tony if vercel will work
interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPlan?: "monthly" | "yearly"; // Pre-select a plan when modal opens
}

type PayPalButtonActions = {
  subscription: {
    create: (data: Record<string, unknown>) => Promise<string>;
  };
};

type PayPalButtonOptions = {
  createSubscription: (
    data: Record<string, unknown>,
    actions: PayPalButtonActions
  ) => Promise<string>;
  onApprove: (
    data: Record<string, unknown>,
    actions: PayPalButtonActions
  ) => Promise<void>;
  onError: (err: unknown) => void;
  onCancel: (data: Record<string, unknown>) => void;
  style?: {
    shape?: string;
    color?: string;
    layout?: string;
    label?: string;
  };
};

// PayPal SDK types
declare global {
  interface Window {
    paypal?: {
      Buttons: (options: PayPalButtonOptions) => {
        render: (selector: string) => Promise<void>;
      };
    };
  }
}

// --- IMPORTANT: Paste your Live Client ID here ---
// Since you cannot use environment variables on your platform, we will set the ID directly.
const PAYPAL_LIVE_CLIENT_ID =
  "AX6bUOWtKGKAaD0Ry62rtK3jhTDGfzpSMuJCABbUeVENyKdBAei_-xGiY8wT1vvXTypXkHWijfJHENcA";

export function SubscriptionModal({
  open,
  onOpenChange,
  initialPlan,
}: SubscriptionModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isNativeApp = Capacitor.isNativePlatform();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(
    initialPlan || null
  );
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [paypalReady, setPaypalReady] = useState(false);

  const plans = useMemo(
    () => [
      {
        id: "monthly",
        name: "Monthly Pro",
        price: "$19.99",
        period: "/month",
        // ### FIX #1: REPLACE THIS WITH YOUR *LIVE* MONTHLY PLAN ID ###
        planId: "P-9NW37063VU373363ENCYI3LY",
        features: [
          "Up to 10 profile images",
          "Audio & video links on profile",
          "Full messaging access",
          "Featured in Pro Artists section",
          "Pro badge for trust & visibility",
          "Unlimited booking requests",
          "Priority customer support",
        ],
        popular: false,
      },
      {
        id: "yearly",
        name: "Yearly Pro",
        price: "$179.88",
        period: "/year",
        // ### FIX #2: REPLACE THIS WITH YOUR *LIVE* YEARLY PLAN ID ###
        planId: "P-83U36288W1589964ANCYI6QQ",
        features: [
          "Everything in Monthly Pro",
          "Save $60 per year",
          "Best value for serious performers",
          "All premium features included",
        ],
        popular: true,
        savings: "Save $60!",
      },
    ],
    []
  );

  // Auto-select plan when modal opens with initialPlan
  useEffect(() => {
    if (open && initialPlan) {
      // Always set the initial plan when modal opens (if provided)
      setSelectedPlan(initialPlan);
    } else if (!open && !initialPlan) {
      // Reset when modal closes (unless we have initialPlan for next open)
      setSelectedPlan(null);
    }
  }, [open, initialPlan]);

  // Load PayPal SDK
  useEffect(() => {
    if (!open || isNativeApp) {
      setPaypalLoaded(false);
      setPaypalReady(false);
      // Don't reset selectedPlan if we have initialPlan - keep it for next open
      if (!initialPlan) {
        setSelectedPlan(null);
      }
      setIsLoading(false);
      setLoadingPlanId(null);
      return;
    }

    if (isNativeApp) {
      // Native flow takes place in external browser; skip PayPal SDK
      return;
    }

    // Check if user is authenticated - just close modal if not authenticated, don't show error
    if (!user) {
      onOpenChange(false);
      return;
    }

    if (
      !PAYPAL_LIVE_CLIENT_ID ||
      PAYPAL_LIVE_CLIENT_ID.includes("REPLACE_WITH")
    ) {
      toast({
        title: "Configuration Error",
        description: "PayPal is not configured. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const loadPayPalScript = () => {
      if (window.paypal) {
        setPaypalLoaded(true);
        setIsLoading(false);
        return;
      }

      // Remove any existing PayPal script
      const existingScript = document.querySelector(
        'script[src*="paypal.com/sdk"]'
      );
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_LIVE_CLIENT_ID}&vault=true&intent=subscription`;
      script.async = true;
      script.onload = () => {
        setPaypalLoaded(true);
        setIsLoading(false);
      };
      script.onerror = () => {
        setIsLoading(false);
        toast({
          title: "Error",
          description:
            "Failed to load PayPal. Please check your internet connection and try again.",
          variant: "destructive",
        });
      };
      document.head.appendChild(script);
    };

    // Small delay to ensure modal is rendered
    const timer = setTimeout(() => {
      loadPayPalScript();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [open, user, toast, navigate, onOpenChange, initialPlan, isNativeApp]);

  // Render PayPal buttons when plan is selected and PayPal is loaded
  useEffect(() => {
    if (isNativeApp) return;
    if (!paypalLoaded || !selectedPlan || !window.paypal || !user) return;

    const plan = plans.find((p) => p.id === selectedPlan);
    if (!plan) return;

    const containerId = `paypal-button-container-${plan.id}`;

    // Wait for container to be in DOM
    const renderButton = () => {
      const container = document.getElementById(containerId);
      if (!container) {
        // Container not ready, try again after a short delay
        setTimeout(renderButton, 200);
        return;
      }

      // Clear any existing PayPal buttons
      container.innerHTML = "";

      // For native apps, intercept clicks on PayPal button container
      if (isNativeApp) {
        const clickInterceptor = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          // Check if click is on PayPal button or its children
          if (
            target.closest(
              '[data-paypal-button], [class*="paypal"], iframe[src*="paypal"]'
            )
          ) {
            // The main.tsx handler should catch the window.open call
          }
        };
        container.addEventListener("click", clickInterceptor, true);
      }

      setPaypalReady(false);
      window.paypal
        .Buttons({
          createSubscription: async (
            data: Record<string, unknown>,
            actions: PayPalButtonActions
          ) => {
            // Get return destination (app or web)
            const returnTo = getReturnDestination();
            const baseUrl = "https://qtalent.live"; // Always use production domain

            // Build return URL with return destination tracking
            const returnUrl = new URL("/subscription-success", baseUrl);
            returnUrl.searchParams.set("returnTo", returnTo);

            const cancelUrl = new URL("/subscription-cancelled", baseUrl);
            cancelUrl.searchParams.set("returnTo", returnTo);

            const subscriptionData = {
              plan_id: plan.planId,
              custom_id: user.id, // This is working perfectly!
              application_context: {
                brand_name: "QTalent",
                shipping_preference: "NO_SHIPPING",
                user_action: "SUBSCRIBE_NOW",
                return_url: returnUrl.toString(),
                cancel_url: cancelUrl.toString(),
              },
            };

            try {
              const result = await actions.subscription.create(
                subscriptionData
              );

              // Note: PayPal SDK will call window.open() with the approval URL
              // The main.tsx handler intercepts this and opens it in Capacitor Browser
              // No need to manually open here - the interception handles it
              return result;
            } catch (error) {
              console.error("PayPal subscription creation error:", error);
              throw error;
            }
          },
          onApprove: async (data: Record<string, unknown>) => {
            toast({
              title: "Subscription Successful!",
              description: "Redirecting to confirmation page...",
              duration: 3000,
            });
            onOpenChange(false);
            const redirectUrl = new URL(
              "/subscription-success",
              window.location.origin
            );
            if (typeof data === "object" && data !== null) {
              const subscriptionId = (data as Record<string, unknown>)[
                "subscriptionID"
              ];
              if (typeof subscriptionId === "string") {
                redirectUrl.searchParams.set("subscription_id", subscriptionId);
              }
            }
            navigate(redirectUrl.pathname + redirectUrl.search);
          },
          onError: (err) => {
            console.error("PayPal onError handler triggered", err);
            toast({
              title: "Subscription Error",
              description:
                "There was an issue processing your subscription. Please try again.",
              variant: "destructive",
            });
            setSelectedPlan(null);
          },
          onCancel: (data: Record<string, unknown>) => {
            toast({
              title: "Subscription Cancelled",
              description: "You cancelled the subscription process.",
            });
            setSelectedPlan(null);
          },
          style: {
            shape: "rect",
            color: "gold",
            layout: "vertical",
            label: "subscribe",
          },
        })
        .render(`#${containerId}`)
        .then(() => {
          setPaypalReady(true);
        })
        .catch((err) => {
          console.error("PayPal render error:", err);
          toast({
            title: "Error",
            description: "Failed to load PayPal button. Please try again.",
            variant: "destructive",
          });
        });
    };

    // Start rendering
    renderButton();
  }, [
    paypalLoaded,
    selectedPlan,
    user,
    toast,
    onOpenChange,
    navigate,
    isNativeApp,
    plans,
  ]);

  const handlePlanSelect = useCallback(
    async (planId: string) => {
      if (!user) {
        // Close modal and maybe redirect to login
        onOpenChange(false);
        toast({
          title: "Sign in required",
          description: "Please sign in to subscribe to Pro.",
          variant: "destructive",
        });
        return;
      }

      // ✅ Native (Capacitor) flow
      if (isNativeApp) {
        const plan = plans.find((p) => p.id === planId);
        if (!plan) {
          toast({
            title: "Plan unavailable",
            description: "Please choose a different plan.",
            variant: "destructive",
          });
          return;
        }

        // Make sure we have a valid Supabase session
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;

        if (!session) {
          toast({
            title: "Session expired",
            description:
              "Please sign in again to continue with your subscription.",
            variant: "destructive",
          });
          onOpenChange(false);
          return;
        }

        setIsLoading(true);
        setLoadingPlanId(planId);
        try {
          const { data, error } = await supabase.functions.invoke<{
            approvalUrl?: string;
          }>("create-paypal-subscription", {
            body: {
              plan_id: plan.planId,
              returnTo: "app",
            },
            // Explicitly send the access token
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (error || !data?.approvalUrl) {
            throw new Error(
              error?.message || "Unable to start PayPal checkout"
            );
          }

          toast({
            title: "Secure PayPal Checkout",
            description:
              "We opened a secure browser window. Complete your payment there, then return to the app.",
            duration: 5000,
          });

          await Browser.open({
            url: data.approvalUrl,
            presentationStyle: "fullscreen",
          }).catch((browserError) => {
            console.warn(
              "Browser.open failed, opening in new tab:",
              browserError
            );
            window.open(data.approvalUrl, "_blank", "noopener,noreferrer");
          });

          onOpenChange(false);
        } catch (error) {
          console.error("PayPal checkout error:", error);
          toast({
            title: "Checkout Error",
            description:
              error instanceof Error
                ? error.message
                : "Failed to open PayPal. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
          setLoadingPlanId(null);
        }
        return;
      }

      // 🌐 Web flow: just select plan and let PayPal JS render inline
      if (!paypalLoaded || isLoading || !window.paypal) {
        toast({
          title: "Please wait",
          description: "PayPal is loading. Please try again in a moment.",
        });
        return;
      }

      // Select plan to render PayPal buttons inline
      setSelectedPlan(planId);
    },
    [user, onOpenChange, isNativeApp, paypalLoaded, isLoading, toast, plans]
  );
  const handleClose = (open: boolean) => {
    if (!open) {
      setSelectedPlan(null);
      setIsLoading(false);
      setLoadingPlanId(null);
    }
    onOpenChange(open);
  };
  const canShowPlans = isNativeApp || (paypalLoaded && !isLoading);
  const showPayPalFallback = !isNativeApp && !isLoading && !paypalLoaded;

  return (
    <Dialog open={open} onOpenChange={handleClose} modal={!isNativeApp}>
      <DialogContent
        className={cn(
          "max-w-4xl max-h-[90vh] overflow-y-auto",
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
            "text-center pb-6 pt-6 px-6",
            isNativeApp &&
              "pb-3 pt-4 px-5 border-b border-border/30 bg-background"
          )}
        >
          <DialogTitle
            className={cn(
              "flex items-center justify-center gap-3",
              isNativeApp
                ? "text-xl font-bold tracking-tight"
                : "text-2xl md:text-3xl"
            )}
          >
            <Crown
              className={cn(
                "text-brand-warning",
                isNativeApp ? "h-6 w-6" : "h-6 w-6 md:h-8 w-8"
              )}
            />
            {initialPlan && selectedPlan
              ? "Complete Your Pro Subscription"
              : "Choose Your Pro Plan"}
          </DialogTitle>
          <p
            className={cn(
              "text-muted-foreground mt-2",
              isNativeApp && "text-sm px-1 leading-relaxed"
            )}
          >
            {initialPlan && selectedPlan
              ? "Review your plan and proceed to payment"
              : "Unlock premium features and keep 100% of your earnings"}
          </p>
        </DialogHeader>

        <div
          className={cn(
            "flex-1 overflow-y-auto",
            isNativeApp && "px-5 pb-6 pt-2"
          )}
        >
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2
                className={cn(
                  "animate-spin text-primary",
                  isNativeApp ? "h-6 w-6" : "h-8 w-8"
                )}
              />
              <span
                className={cn(
                  "ml-3 text-muted-foreground",
                  isNativeApp && "text-sm"
                )}
              >
                Loading payment options...
              </span>
            </div>
          )}

          {showPayPalFallback && (
            <div className="text-center py-8">
              <p
                className={cn(
                  "text-muted-foreground mb-4",
                  isNativeApp && "text-sm"
                )}
              >
                Unable to load payment options.
              </p>
              <Button
                onClick={() => window.location.reload()}
                className={cn(isNativeApp && "h-10 text-sm")}
              >
                Retry
              </Button>
            </div>
          )}

          {canShowPlans && (
            <>
              {/* If initialPlan is provided and plan is selected, skip plan selection and show PayPal button directly */}
              {initialPlan && selectedPlan ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <p
                      className={cn(
                        "text-muted-foreground mb-4",
                        isNativeApp && "text-sm"
                      )}
                    >
                      {selectedPlan === "monthly"
                        ? "Monthly Pro Plan"
                        : "Yearly Pro Plan"}
                    </p>
                  </div>
                  {plans
                    .filter((plan) => plan.id === selectedPlan)
                    .map((plan) => (
                      <Card
                        key={plan.id}
                        className={cn(
                          "border-accent shadow-lg",
                          isNativeApp &&
                            "border-2 shadow-xl rounded-2xl overflow-hidden"
                        )}
                      >
                        <CardHeader
                          className={cn(
                            "text-center pb-4",
                            isNativeApp
                              ? "px-5 pt-6 pb-5 bg-gradient-to-b from-accent/10 to-transparent"
                              : "px-6 pt-6"
                          )}
                        >
                          <CardTitle
                            className={cn(
                              isNativeApp
                                ? "text-lg font-bold tracking-tight"
                                : "text-xl"
                            )}
                          >
                            {plan.name}
                          </CardTitle>
                          <div className={cn("mt-4", isNativeApp && "mt-4")}>
                            <div
                              className={cn(
                                "font-bold",
                                isNativeApp
                                  ? "text-2xl tracking-tight"
                                  : "text-3xl"
                              )}
                            >
                              {plan.price}
                              <span
                                className={cn(
                                  "font-normal text-muted-foreground",
                                  isNativeApp ? "text-sm ml-1" : "text-lg"
                                )}
                              >
                                {plan.period}
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent
                          className={cn(
                            "space-y-4",
                            isNativeApp ? "px-5 pb-6 space-y-4" : "px-6 pb-6"
                          )}
                        >
                          <div
                            className={cn(
                              "space-y-2",
                              isNativeApp && "space-y-2.5"
                            )}
                          >
                            {plan.features.map((feature, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "flex items-start",
                                  isNativeApp ? "space-x-3" : "space-x-2"
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex-shrink-0 mt-0.5 rounded-full bg-accent/20 p-1",
                                    isNativeApp && "p-1.5"
                                  )}
                                >
                                  <Check
                                    className={cn(
                                      "text-accent",
                                      isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4"
                                    )}
                                  />
                                </div>
                                <span
                                  className={cn(
                                    isNativeApp
                                      ? "text-sm leading-relaxed flex-1"
                                      : "text-sm"
                                  )}
                                >
                                  {feature}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div
                            className={cn(
                              "space-y-4",
                              isNativeApp && "space-y-3 pt-2"
                            )}
                          >
                            {isNativeApp ? (
                              <>
                                <Button
                                  className="w-full h-12 text-sm font-semibold"
                                  onClick={() => handlePlanSelect(plan.id)}
                                >
                                  Continue in Browser
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPlan(null);
                                    onOpenChange(false);
                                  }}
                                  className="w-full"
                                >
                                  Choose Different Plan
                                </Button>
                              </>
                            ) : (
                              <>
                                <div
                                  id={`paypal-button-container-${plan.id}`}
                                  className="min-h-[50px]"
                                ></div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPlan(null);
                                    onOpenChange(false);
                                  }}
                                  className="w-full"
                                >
                                  Choose Different Plan
                                </Button>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              ) : (
                /* Show plan selection if no initialPlan or user wants to change */
                <div
                  className={cn(
                    "grid gap-4",
                    isNativeApp ? "grid-cols-1 gap-4" : "md:grid-cols-2 gap-6"
                  )}
                >
                  {plans.map((plan) => (
                    <Card
                      key={plan.id}
                      className={cn(
                        "relative transition-all",
                        isNativeApp && "rounded-2xl shadow-lg border-2",
                        plan.popular
                          ? "border-accent shadow-xl"
                          : "border-border/50 hover:border-border"
                      )}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                          <Badge
                            className={cn(
                              "bg-accent text-accent-foreground shadow-md",
                              isNativeApp && "text-xs px-3 py-1 rounded-full"
                            )}
                          >
                            <Crown
                              className={cn(
                                "mr-1.5",
                                isNativeApp ? "h-3 w-3" : "h-3 w-3"
                              )}
                            />
                            Most Popular
                          </Badge>
                        </div>
                      )}
                      <CardHeader
                        className={cn(
                          "text-center pb-4",
                          isNativeApp
                            ? "px-5 pt-6 pb-5 bg-gradient-to-b from-accent/10 to-transparent rounded-t-2xl"
                            : "px-6 pt-6"
                        )}
                      >
                        <CardTitle
                          className={cn(
                            isNativeApp
                              ? "text-lg font-bold tracking-tight"
                              : "text-xl"
                          )}
                        >
                          {plan.name}
                        </CardTitle>
                        <div className={cn("mt-4", isNativeApp && "mt-4")}>
                          <div
                            className={cn(
                              "font-bold",
                              isNativeApp
                                ? "text-2xl tracking-tight"
                                : "text-3xl"
                            )}
                          >
                            {plan.price}
                            <span
                              className={cn(
                                "font-normal text-muted-foreground",
                                isNativeApp ? "text-sm ml-1" : "text-lg"
                              )}
                            >
                              {plan.period}
                            </span>
                          </div>
                          {plan.savings && (
                            <div
                              className={cn(
                                "text-brand-success font-medium mt-2 bg-brand-success/10 rounded-full px-3 py-1 inline-block",
                                isNativeApp && "text-xs px-2.5 py-1 mt-2.5"
                              )}
                            >
                              {plan.savings}
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent
                        className={cn(
                          "space-y-4",
                          isNativeApp ? "px-5 pb-6 space-y-4" : "px-6 pb-6"
                        )}
                      >
                        <div
                          className={cn(
                            "space-y-2",
                            isNativeApp && "space-y-2.5"
                          )}
                        >
                          {plan.features.map((feature, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "flex items-start",
                                isNativeApp ? "space-x-3" : "space-x-2"
                              )}
                            >
                              <div
                                className={cn(
                                  "flex-shrink-0 mt-0.5 rounded-full bg-accent/20 p-1",
                                  isNativeApp && "p-1.5"
                                )}
                              >
                                <Check
                                  className={cn(
                                    "text-accent",
                                    isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4"
                                  )}
                                />
                              </div>
                              <span
                                className={cn(
                                  isNativeApp
                                    ? "text-sm leading-relaxed flex-1"
                                    : "text-sm"
                                )}
                              >
                                {feature}
                              </span>
                            </div>
                          ))}
                        </div>
                        {selectedPlan === plan.id ? (
                          <div
                            className={cn(
                              "space-y-4",
                              isNativeApp && "space-y-3 pt-2"
                            )}
                          >
                            {isNativeApp ? (
                              <>
                                <Button
                                  className="w-full h-12 text-sm font-semibold"
                                  onClick={() => handlePlanSelect(plan.id)}
                                >
                                  Continue in Browser
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedPlan(null)}
                                  className="w-full"
                                >
                                  Choose Different Plan
                                </Button>
                              </>
                            ) : (
                              <>
                                <div
                                  id={`paypal-button-container-${plan.id}`}
                                  className="min-h-[50px]"
                                ></div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedPlan(null)}
                                  className="w-full"
                                >
                                  Choose Different Plan
                                </Button>
                              </>
                            )}
                          </div>
                        ) : (
                          <Button
                            className={cn(
                              "w-full gap-2 rounded-xl",
                              isNativeApp
                                ? "h-12 text-base font-semibold shadow-md active:scale-[0.98] transition-transform"
                                : "relative overflow-hidden group"
                            )}
                            variant={plan.popular ? "default" : "outline"}
                            onClick={() => handlePlanSelect(plan.id)}
                            disabled={
                              isNativeApp
                                ? loadingPlanId === plan.id
                                : !paypalLoaded || loadingPlanId === plan.id
                            }
                          >
                            {loadingPlanId === plan.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Opening PayPal...</span>
                              </>
                            ) : (
                              <>
                                <Crown
                                  className={cn(
                                    isNativeApp ? "h-4 w-4" : "h-4 w-4"
                                  )}
                                />
                                {isNativeApp
                                  ? `Select ${plan.name}`
                                  : paypalLoaded
                                  ? `Select ${plan.name}`
                                  : "Loading PayPal..."}
                              </>
                            )}
                            {paypalLoaded && !isNativeApp && !isLoading && (
                              <>
                                <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/20 to-brand-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                              </>
                            )}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        {paypalLoaded && !isLoading && (
          <div
            className={cn(
              "text-center text-xs text-muted-foreground border-t border-border/50 pt-4",
              "px-6 pb-6 mt-6"
            )}
          >
            <p>
              Secure payments powered by PayPal. Cancel anytime from your PayPal
              account.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
