import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { cn } from "@/lib/utils";

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPlan?: 'monthly' | 'yearly'; // Pre-select a plan when modal opens
}

// PayPal SDK types
declare global {
  interface Window {
    paypal?: {
      Buttons: (options: {
        createSubscription: (data: any, actions: any) => Promise<string>;
        onApprove: (data: any, actions: any) => Promise<void>;
        onError: (err: any) => void;
        onCancel: (data: any) => void;
        style?: {
          shape?: string;
          color?: string;
          layout?: string;
          label?: string;
        };
      }) => {
        render: (selector: string) => Promise<void>;
      };
    };
  }
}

// --- IMPORTANT: Paste your Live Client ID here ---
// Since you cannot use environment variables on your platform, we will set the ID directly.
const PAYPAL_LIVE_CLIENT_ID = "AX6bUOWtKGKAaD0Ry62rtK3jhTDGfzpSMuJCABbUeVENyKdBAei_-xGiY8wT1vvXTypXkHWijfJHENcA";

export function SubscriptionModal({ open, onOpenChange, initialPlan }: SubscriptionModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isNativeApp = Capacitor.isNativePlatform();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(initialPlan || null);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const plans = [
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
  ];

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
    if (!open) {
      setPaypalLoaded(false);
      // Don't reset selectedPlan if we have initialPlan - keep it for next open
      if (!initialPlan) {
        setSelectedPlan(null);
      }
      setIsLoading(false);
      return;
    }

    // Check if user is authenticated
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to subscribe to Pro.",
        variant: "destructive",
      });
      onOpenChange(false);
      navigate('/auth');
      return;
    }

    if (!PAYPAL_LIVE_CLIENT_ID || PAYPAL_LIVE_CLIENT_ID.includes("REPLACE_WITH")) {
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
      const existingScript = document.querySelector('script[src*="paypal.com/sdk"]');
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
          description: "Failed to load PayPal. Please check your internet connection and try again.",
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
  }, [open, user, toast, navigate, onOpenChange]);

  // Render PayPal buttons when plan is selected and PayPal is loaded
  useEffect(() => {
    if (!paypalLoaded || !selectedPlan || !window.paypal || !user) return;

    const plan = plans.find((p) => p.id === selectedPlan);
    if (!plan) return;

    const containerId = `paypal-button-container-${plan.id}`;
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear any existing PayPal buttons
    container.innerHTML = "";

    // For native apps, intercept clicks on PayPal button container
    if (isNativeApp) {
      const clickInterceptor = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        // Check if click is on PayPal button or its children
        if (target.closest('[data-paypal-button], [class*="paypal"], iframe[src*="paypal"]')) {
          console.log("🔍 PayPal button clicked, waiting for popup interception...");
          // The main.tsx handler should catch the window.open call
        }
      };
      container.addEventListener("click", clickInterceptor, true);
    }

    window.paypal
      .Buttons({
        createSubscription: async (data, actions) => {
          // This part is correct! It sends the user.id as custom_id
          // For native apps, use deep link URLs; for web, use regular URLs
          const baseUrl = isNativeApp 
            ? "https://qtalent.live" // Use your production domain for deep linking
            : window.location.origin;
          
          const subscriptionData = {
            plan_id: plan.planId,
            custom_id: user.id, // This is working perfectly!
            application_context: {
              brand_name: "QTalent",
              shipping_preference: "NO_SHIPPING",
              user_action: "SUBSCRIBE_NOW",
              return_url: `${baseUrl}/subscription-success`,
              cancel_url: `${baseUrl}/subscription-cancelled`,
            },
          };
          
          try {
            const result = await actions.subscription.create(subscriptionData);
            
            // Note: PayPal SDK will call window.open() with the approval URL
            // The main.tsx handler intercepts this and opens it in Capacitor Browser
            // No need to manually open here - the interception handles it
            return result;
          } catch (error) {
            console.error("PayPal subscription creation error:", error);
            throw error;
          }
        },
        onApprove: async (data, actions) => {
          toast({
            title: "Subscription Successful!",
            description: "Redirecting to confirmation page...",
            duration: 3000,
          });
          onOpenChange(false);
          const redirectUrl = new URL("/subscription-success", window.location.origin);
          if (data.subscriptionID) {
            redirectUrl.searchParams.set("subscription_id", data.subscriptionID);
          }
          navigate(redirectUrl.pathname + redirectUrl.search);
        },
        onError: (err) => {
          console.error("PayPal onError handler triggered", err);
          toast({
            title: "Subscription Error",
            description: "There was an issue processing your subscription. Please try again.",
            variant: "destructive",
          });
          setSelectedPlan(null);
        },
        onCancel: (data) => {
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
      .render(`#${containerId}`);
  }, [paypalLoaded, selectedPlan, user, plans, toast, onOpenChange, navigate]);

  const handlePlanSelect = (planId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to subscribe to Pro.",
        variant: "destructive",
      });
      onOpenChange(false);
      navigate('/auth');
      return;
    }
    if (!paypalLoaded || isLoading) {
      toast({
        title: "Please wait",
        description: "PayPal is loading. Please try again in a moment.",
      });
      return;
    }
    setSelectedPlan(planId);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSelectedPlan(null);
    }
    onOpenChange(open);
  };
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "max-w-4xl max-h-[90vh] overflow-y-auto",
        isNativeApp && "max-w-full mx-0 rounded-t-[28px] p-0 h-[92vh] max-h-[92vh] flex flex-col bg-background shadow-2xl"
      )}>
        {/* Native-style drag handle */}
        {isNativeApp && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>
        )}
        
        <DialogHeader className={cn(
          "text-center pb-6 pt-6 px-6",
          isNativeApp && "pb-3 pt-4 px-5 border-b border-border/30 bg-background"
        )}>
          <DialogTitle className={cn(
            "flex items-center justify-center gap-3",
            isNativeApp ? "text-xl font-bold tracking-tight" : "text-2xl md:text-3xl"
          )}>
            <Crown className={cn("text-brand-warning", isNativeApp ? "h-6 w-6" : "h-6 w-6 md:h-8 w-8")} />
            {initialPlan && selectedPlan ? "Complete Your Pro Subscription" : "Choose Your Pro Plan"}
          </DialogTitle>
          <p className={cn("text-muted-foreground mt-2", isNativeApp && "text-sm px-1 leading-relaxed")}>
            {initialPlan && selectedPlan 
              ? "Review your plan and proceed to payment" 
              : "Unlock premium features and keep 100% of your earnings"}
          </p>
        </DialogHeader>
        
        <div className={cn("flex-1 overflow-y-auto", isNativeApp && "px-5 pb-6 pt-2")}>
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className={cn("animate-spin text-primary", isNativeApp ? "h-6 w-6" : "h-8 w-8")} />
              <span className={cn("ml-3 text-muted-foreground", isNativeApp && "text-sm")}>
                Loading payment options...
              </span>
            </div>
          )}
          
          {!isLoading && !paypalLoaded && (
            <div className="text-center py-8">
              <p className={cn("text-muted-foreground mb-4", isNativeApp && "text-sm")}>
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
          {paypalLoaded && !isLoading && (
            <>
            {/* If initialPlan is provided and plan is selected, skip plan selection and show PayPal button directly */}
            {initialPlan && selectedPlan ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className={cn("text-muted-foreground mb-4", isNativeApp && "text-sm")}>
                    {selectedPlan === 'monthly' ? 'Monthly Pro Plan' : 'Yearly Pro Plan'}
                  </p>
                </div>
                {plans
                  .filter(plan => plan.id === selectedPlan)
                  .map((plan) => (
                    <Card key={plan.id} className={cn(
                      "border-accent shadow-lg",
                      isNativeApp && "border-2 shadow-xl rounded-2xl overflow-hidden"
                    )}>
                      <CardHeader className={cn(
                        "text-center pb-4",
                        isNativeApp ? "px-5 pt-6 pb-5 bg-gradient-to-b from-accent/10 to-transparent" : "px-6 pt-6"
                      )}>
                        <CardTitle className={cn(
                          isNativeApp ? "text-lg font-bold tracking-tight" : "text-xl"
                        )}>
                          {plan.name}
                        </CardTitle>
                        <div className={cn("mt-4", isNativeApp && "mt-4")}>
                          <div className={cn(
                            "font-bold",
                            isNativeApp ? "text-2xl tracking-tight" : "text-3xl"
                          )}>
                            {plan.price}
                            <span className={cn(
                              "font-normal text-muted-foreground",
                              isNativeApp ? "text-sm ml-1" : "text-lg"
                            )}>
                              {plan.period}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className={cn(
                        "space-y-4",
                        isNativeApp ? "px-5 pb-6 space-y-4" : "px-6 pb-6"
                      )}>
                        <div className={cn("space-y-2", isNativeApp && "space-y-2.5")}>
                          {plan.features.map((feature, idx) => (
                            <div key={idx} className={cn(
                              "flex items-start",
                              isNativeApp ? "space-x-3" : "space-x-2"
                            )}>
                              <div className={cn(
                                "flex-shrink-0 mt-0.5 rounded-full bg-accent/20 p-1",
                                isNativeApp && "p-1.5"
                              )}>
                                <Check className={cn(
                                  "text-accent",
                                  isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4"
                                )} />
                              </div>
                              <span className={cn(
                                isNativeApp ? "text-sm leading-relaxed flex-1" : "text-sm"
                              )}>
                                {feature}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className={cn("space-y-4", isNativeApp && "space-y-3 pt-2")}>
                          {isNativeApp ? (
                            // Native-style info card for desktop subscription
                            <div className={cn(
                              "rounded-2xl border-2 overflow-hidden",
                              "bg-gradient-to-br from-primary/5 via-background to-primary/5",
                              "border-primary/20 shadow-lg"
                            )}>
                              <div className="p-5 space-y-4">
                                <div className="flex items-center justify-center">
                                  <div className="rounded-full bg-brand-warning/20 p-3">
                                    <Crown className="h-7 w-7 text-brand-warning" />
                                  </div>
                                </div>
                                <div className="text-center space-y-2">
                                  <h3 className="text-base font-bold tracking-tight">
                                    Subscribe on Desktop
                                  </h3>
                                  <p className="text-sm text-muted-foreground leading-relaxed px-2">
                                    For the best payment experience, complete your Pro subscription on a desktop or laptop.
                                  </p>
                                  <p className="text-xs text-muted-foreground/80 font-medium">
                                    Visit <span className="font-semibold text-foreground">qtalent.live/pricing</span>
                                  </p>
                                </div>
                                <Button
                                  onClick={() => {
                                    const pricingUrl = "https://qtalent.live/pricing";
                                    Browser.open({
                                      url: pricingUrl,
                                      toolbarColor: "#0A0118",
                                    }).catch(() => {
                                      window.location.href = pricingUrl;
                                    });
                                    onOpenChange(false);
                                  }}
                                  className={cn(
                                    "w-full h-12 text-base font-semibold rounded-xl",
                                    "bg-primary text-primary-foreground shadow-md",
                                    "active:scale-[0.98] transition-transform"
                                  )}
                                >
                                  Open Pricing Page
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // For web, show PayPal button
                            <div 
                              id={`paypal-button-container-${plan.id}`} 
                              className="min-h-[50px]"
                            ></div>
                          )}
                          {!isNativeApp && (
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
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              /* Show plan selection if no initialPlan or user wants to change */
              <div className={cn(
                "grid gap-4",
                isNativeApp ? "grid-cols-1 gap-4" : "md:grid-cols-2 gap-6"
              )}>
              {plans.map((plan) => (
              <Card key={plan.id} className={cn(
                "relative transition-all",
                isNativeApp && "rounded-2xl shadow-lg border-2",
                plan.popular 
                  ? "border-accent shadow-xl" 
                  : "border-border/50 hover:border-border"
              )}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className={cn(
                      "bg-accent text-accent-foreground shadow-md",
                      isNativeApp && "text-xs px-3 py-1 rounded-full"
                    )}>
                      <Crown className={cn("mr-1.5", isNativeApp ? "h-3 w-3" : "h-3 w-3")} />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className={cn(
                  "text-center pb-4",
                  isNativeApp 
                    ? "px-5 pt-6 pb-5 bg-gradient-to-b from-accent/10 to-transparent rounded-t-2xl" 
                    : "px-6 pt-6"
                )}>
                  <CardTitle className={cn(
                    isNativeApp ? "text-lg font-bold tracking-tight" : "text-xl"
                  )}>
                    {plan.name}
                  </CardTitle>
                  <div className={cn("mt-4", isNativeApp && "mt-4")}>
                    <div className={cn(
                      "font-bold",
                      isNativeApp ? "text-2xl tracking-tight" : "text-3xl"
                    )}>
                      {plan.price}
                      <span className={cn(
                        "font-normal text-muted-foreground",
                        isNativeApp ? "text-sm ml-1" : "text-lg"
                      )}>
                        {plan.period}
                      </span>
                    </div>
                    {plan.savings && (
                      <div className={cn(
                        "text-brand-success font-medium mt-2 bg-brand-success/10 rounded-full px-3 py-1 inline-block",
                        isNativeApp && "text-xs px-2.5 py-1 mt-2.5"
                      )}>
                        {plan.savings}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className={cn(
                  "space-y-4",
                  isNativeApp ? "px-5 pb-6 space-y-4" : "px-6 pb-6"
                )}>
                  <div className={cn("space-y-2", isNativeApp && "space-y-2.5")}>
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className={cn(
                        "flex items-start",
                        isNativeApp ? "space-x-3" : "space-x-2"
                      )}>
                        <div className={cn(
                          "flex-shrink-0 mt-0.5 rounded-full bg-accent/20 p-1",
                          isNativeApp && "p-1.5"
                        )}>
                          <Check className={cn(
                            "text-accent",
                            isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4"
                          )} />
                        </div>
                        <span className={cn(
                          isNativeApp ? "text-sm leading-relaxed flex-1" : "text-sm"
                        )}>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                  {selectedPlan === plan.id ? (
                    <div className={cn("space-y-4", isNativeApp && "space-y-3 pt-2")}>
                      {isNativeApp ? (
                        // Native-style info card
                        <div className={cn(
                          "rounded-2xl border-2 overflow-hidden",
                          "bg-gradient-to-br from-primary/5 via-background to-primary/5",
                          "border-primary/20 shadow-lg"
                        )}>
                          <div className="p-5 space-y-4">
                            <div className="flex items-center justify-center">
                              <div className="rounded-full bg-brand-warning/20 p-3">
                                <Crown className="h-7 w-7 text-brand-warning" />
                              </div>
                            </div>
                            <div className="text-center space-y-2">
                              <h3 className="text-base font-bold tracking-tight">
                                Subscribe on Desktop
                              </h3>
                              <p className="text-sm text-muted-foreground leading-relaxed px-2">
                                For the best payment experience, complete your Pro subscription on a desktop or laptop.
                              </p>
                              <p className="text-xs text-muted-foreground/80 font-medium">
                                Visit <span className="font-semibold text-foreground">qtalent.live/pricing</span>
                              </p>
                            </div>
                            <Button
                              onClick={() => {
                                const pricingUrl = "https://qtalent.live/pricing";
                                Browser.open({
                                  url: pricingUrl,
                                  toolbarColor: "#0A0118",
                                }).catch(() => {
                                  window.location.href = pricingUrl;
                                });
                                onOpenChange(false);
                              }}
                              className={cn(
                                "w-full h-12 text-base font-semibold rounded-xl",
                                "bg-primary text-primary-foreground shadow-md",
                                "active:scale-[0.98] transition-transform"
                              )}
                            >
                              Open Pricing Page
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Web: Show PayPal button
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
                      disabled={!paypalLoaded || isLoading}
                    >
                      <Crown className={cn(isNativeApp ? "h-4 w-4" : "h-4 w-4")} />
                      {paypalLoaded ? `Select ${plan.name}` : "Loading PayPal..."}
                      {paypalLoaded && !isNativeApp && (
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
        {paypalLoaded && !isLoading && !isNativeApp && (
          <div className={cn(
            "text-center text-xs text-muted-foreground border-t border-border/50 pt-4",
            "px-6 pb-6 mt-6"
          )}>
            <p>
              Secure payments powered by PayPal. Cancel anytime from your PayPal account.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
