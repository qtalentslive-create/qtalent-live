import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Zap, Users, MessageSquare, Calendar, Shield, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";
import { restoreSessionFromUrl } from "@/utils/authNavigation";
import { useToast } from "@/hooks/use-toast";

export default function () {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isNativeApp = Capacitor.isNativePlatform();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [initialPlanFromUrl, setInitialPlanFromUrl] = useState<'monthly' | 'yearly' | null>(null);
  const [cameFromApp, setCameFromApp] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  const upgradeSectionRef = useRef<HTMLDivElement>(null);
  const autoClickTimerRef = useRef<number | null>(null);

  // Restore session if coming from Capacitor app
  useEffect(() => {
    const restoreSession = async () => {
      const restored = await restoreSessionFromUrl();
      if (restored) {
        setSessionRestored(true);
        // Refresh the page to update auth state
        window.location.reload();
      }
    };

    // Only restore if we don't have a user yet
    if (!user) {
      restoreSession();
    } else {
      setSessionRestored(true);
    }
  }, [user]);

  const talentPlans = [
    {
      name: "Pro",
      description: "For serious performers who want to earn more",
      monthlyPrice: 19.99,
      yearlyPrice: 179.88,
      commission: "none",
      features: [
        "Everything in Free, plus:",
        "Up to 10 profile images",
        "Audio & video links on profile", 
        "Full messaging access (see booker details)",
        "Featured in Pro Artists section",
        "Pro badge for trust & visibility",
        "Unlimited booking requests",
        "Priority placement in search results",
        "Priority customer support"
      ],
      limitations: [],
      buttonText: "Upgrade to Pro",
      popular: true,
      badge: "Most Popular",
    },
    {
      name: "Free",
      description: "Start your talent journey",
      monthlyPrice: 0,
      yearlyPrice: 0,
      commission: "none",
      features: [
        "Create professional profile",
        "1 profile image only",
        "Basic messaging (filtered)",
        "1 booking request per month",
        "Basic profile visibility",
        "Standard support response"
      ],
      limitations: [
                    "No audio/video links allowed",
                    "Messaging heavily filtered (no booker contact details)",
                    "Limited to 1 booking request per month",
                    "No Pro badge or featured placement"
      ],
      buttonText: "Get Started Free",
      popular: false,
      badge: null
    }
  ];

  const clientFeatures = [
    {
      icon: <Users className="h-8 w-8 text-accent" />,
      title: "Verified Talent",
      description: "All performers are background-checked and verified"
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-accent" />,
      title: "Direct Communication",
      description: "Chat directly with talent to discuss your event needs"
    },
    {
      icon: <Calendar className="h-8 w-8 text-accent" />,
      title: "Easy Booking",
      description: "Simple booking process with direct talent communication"
    },
    {
      icon: <Shield className="h-8 w-8 text-accent" />,
      title: "Direct Connection",
      description: "Connect directly with talent for seamless booking and communication"
    }
  ];

  const handleGetStarted = (planName: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (planName === 'Free') {
      navigate('/talent-dashboard');
    } else {
      // Open subscription modal for Pro plan
      setShowSubscriptionModal(true);
    }
  };

  // Restore session if coming from Capacitor app (run first)
  useEffect(() => {
    const restoreSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const hasSessionParam = params.has("session");
      
      if (hasSessionParam && !user) {
        try {
          const restored = await restoreSessionFromUrl();
          if (restored) {
            setSessionRestored(true);
            toast({
              title: "Session Restored",
              description: "Your session has been restored. Please continue with your subscription.",
            });
            // Give a moment for auth state to update, then check again
            setTimeout(() => {
              // The auth hook should detect the new session automatically
              // No need to reload - React will re-render when user state changes
            }, 500);
          }
        } catch (error) {
          console.error('Failed to restore session:', error);
          toast({
            title: "Session Error",
            description: "Could not restore your session. Please sign in again.",
            variant: "destructive",
          });
        }
      } else if (user) {
        setSessionRestored(true);
      }
    };

    restoreSession();
  }, []); // Run once on mount

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get("plan");
    const source = params.get("source");

    const normalizePlan = (value: string | null): 'monthly' | 'yearly' | null => {
      if (value === 'monthly' || value === 'yearly') return value;
      return null;
    };

    const desiredPlan = normalizePlan(planParam);
    if (desiredPlan) {
      setBillingCycle(desiredPlan);
      setInitialPlanFromUrl(desiredPlan);
      setShowSubscriptionModal(true);
    }

    if (source === "app") {
      setCameFromApp(true);
      // Keep session param if it exists for restoration
      if (!params.has("session")) {
        params.delete("source");
        params.delete("plan");
        const newQuery = params.toString();
        const newUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ""}`;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, [user, sessionRestored]); // Re-run when user is available

  useEffect(() => {
    if (cameFromApp && upgradeSectionRef.current) {
      setTimeout(() => {
        upgradeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [cameFromApp]);

  const modalInitialPlan = useMemo(() => initialPlanFromUrl || billingCycle, [initialPlanFromUrl, billingCycle]);

  useEffect(() => {
    if (cameFromApp && showSubscriptionModal) {
      if (autoClickTimerRef.current) {
        window.clearTimeout(autoClickTimerRef.current);
      }
      autoClickTimerRef.current = window.setTimeout(() => {
        const paypalButton = document.querySelector<HTMLButtonElement>(
          '[data-paypal-button]'
        );
        if (paypalButton) {
          paypalButton.click();
        }
      }, 800);
    }
    return () => {
      if (autoClickTimerRef.current) {
        window.clearTimeout(autoClickTimerRef.current);
        autoClickTimerRef.current = null;
      }
    };
  }, [cameFromApp, showSubscriptionModal]);

  return (
    <div className={cn("min-h-screen bg-background", isNativeApp && "pb-8")}>
      {/* Header */}
      <div className={cn("container mx-auto px-4 pb-8", isNativeApp ? "pt-28" : "pt-24")}>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className={cn("mb-6", isNativeApp && "h-10 text-sm")}
        >
          <ArrowLeft className={cn("mr-2", isNativeApp ? "h-4 w-4" : "h-4 w-4")} />
          Back to Home
        </Button>
      </div>

      {/* Hero Section */}
      <section className={cn("container mx-auto px-4 text-center", isNativeApp ? "mb-8" : "mb-16")}>
        <h1 className={cn("mb-6", isNativeApp ? "text-2xl font-bold" : "text-display")}>
          Choose Your <span className="text-accent">Plan</span>
        </h1>
        <p className={cn("max-w-3xl mx-auto mb-8", isNativeApp ? "text-sm px-2" : "text-subhead")}>
          Whether you're booking talent or showcasing your skills, we have the perfect plan for you.
        </p>
      </section>

      {/* For Talent Section */}
      <section id="upgrade-to-pro" ref={upgradeSectionRef} className={cn("container mx-auto px-4", isNativeApp ? "mb-12" : "mb-20")}>
        {cameFromApp && (
          <div className="max-w-3xl mx-auto mb-6 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent-foreground shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-semibold">Almost there!</p>
              <p className="text-xs text-muted-foreground">
                PayPal checkout will open automatically in a moment. If it doesn’t, tap “Reopen Checkout”.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowSubscriptionModal(true);
              }}
            >
              Reopen Checkout
            </Button>
          </div>
        )}
        <div className={cn("text-center", isNativeApp ? "mb-8" : "mb-12")}>
          <h2 className={cn("mb-4", isNativeApp ? "text-xl font-bold" : "text-headline")}>For Talent</h2>
          <p className={cn("mb-8", isNativeApp ? "text-sm px-2" : "text-subhead")}>Join thousands of performers earning with Qtalent.live</p>
          
          {/* Billing Toggle */}
          <div
            className={cn(
              "inline-flex items-center mb-8 rounded-full border border-border/60 bg-background/60 shadow-inner",
              isNativeApp ? "scale-90" : "p-1"
            )}
          >
            <button
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                "relative px-5 py-2 rounded-full font-medium text-sm transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                billingCycle === 'monthly'
                  ? "bg-card text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={cn(
                "relative px-5 py-2 rounded-full font-medium text-sm transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent flex items-center gap-2",
                billingCycle === 'yearly'
                  ? "bg-card text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
              <span className="text-xs font-semibold text-brand-success bg-brand-success/15 rounded-full px-2.5 py-0.5">
                Save $60/year
              </span>
            </button>
          </div>
        </div>

        <div className={cn("grid gap-4 max-w-4xl mx-auto", isNativeApp ? "grid-cols-1 px-2" : "md:grid-cols-2 md:gap-8 px-2")}>
          {talentPlans.map((plan, index) => (
            <Card 
              key={plan.name} 
              className={`relative glass-card ${
                plan.popular ? 'border-accent shadow-live' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-accent text-accent-foreground text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className={cn("text-center pb-4 px-4", isNativeApp ? "pb-4" : "md:pb-8 md:px-6")}>
                <CardTitle className={cn("flex items-center justify-center gap-2", isNativeApp ? "text-lg" : "text-xl md:text-2xl")}>
                  {plan.name}
                  {plan.name === 'Pro' && <Crown className={cn("text-brand-warning", isNativeApp ? "h-4 w-4" : "h-5 w-5")} />}
                </CardTitle>
                <CardDescription className={cn(isNativeApp ? "text-xs" : "text-sm md:text-base")}>{plan.description}</CardDescription>
                
                <div className={cn("mt-3", isNativeApp ? "mt-2" : "md:mt-4")}>
                  <div className={cn("font-bold", isNativeApp ? "text-2xl" : "text-3xl md:text-4xl")}>
                    ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                    <span className={cn("font-normal text-muted-foreground", isNativeApp ? "text-sm" : "text-base md:text-lg")}>
                      /{billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  <div className={cn("font-semibold mt-2 text-muted-foreground", isNativeApp ? "text-[10px]" : "text-xs md:text-sm")}>
                    Connection fee: {plan.commission}
                  </div>
                  {plan.savings && (
                    <div className={cn("text-brand-success font-medium mt-2 bg-brand-success/10 rounded-full px-3 py-1", isNativeApp && "text-[10px] px-2 py-0.5")}>
                      {plan.savings}
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className={cn("space-y-4 px-4 pb-4", isNativeApp ? "space-y-3" : "md:space-y-6 md:px-6 md:pb-6")}>
                <div className={cn("space-y-2", isNativeApp ? "space-y-1.5" : "md:space-y-3")}>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className={cn("flex items-start", isNativeApp ? "space-x-2" : "space-x-2 md:space-x-3")}>
                      <Check className={cn("text-accent flex-shrink-0 mt-0.5", isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4 md:h-5 md:w-5")} />
                      <span className={cn(isNativeApp ? "text-[11px] leading-tight" : "text-xs md:text-sm")}>{feature}</span>
                    </div>
                  ))}
                </div>
                
                {plan.name === 'Pro' ? (
                  <Button
                    onClick={() => handleGetStarted(plan.name)}
                    variant={plan.popular ? "default" : "outline"}
                    className={cn(
                      "w-full",
                      isNativeApp
                        ? "h-12 text-sm font-semibold"
                        : "text-sm md:text-base py-2 md:py-3"
                    )}
                  >
                    <Crown className={cn("mr-2", isNativeApp ? "h-4 w-4" : "h-4 w-4")} />
                    Upgrade to Pro
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleGetStarted(plan.name)}
                    variant="outline"
                    className={cn(
                      "w-full",
                      isNativeApp
                        ? "h-12 text-sm font-semibold"
                        : "text-sm md:text-base py-2 md:py-3"
                    )}
                  >
                    {plan.buttonText}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>


      {/* FAQ Section */}
      <section className={cn("container mx-auto px-4", isNativeApp ? "py-12" : "py-20")}>
        <div className={cn("text-center", isNativeApp ? "mb-8" : "mb-12")}>
          <h2 className={cn("mb-4", isNativeApp ? "text-lg font-bold" : "text-headline")}>Frequently Asked Questions</h2>
        </div>

        <div className={cn("max-w-3xl mx-auto", isNativeApp ? "space-y-4" : "space-y-6")}>
          <Card className="glass-card">
            <CardContent className={cn("pt-6", isNativeApp && "pt-4 px-4 pb-4")}>
              <h3 className={cn("font-semibold mb-2", isNativeApp && "text-sm")}>What's included in Pro membership?</h3>
              <p className={cn("text-muted-foreground", isNativeApp && "text-xs leading-relaxed")}>
                Pro members get unlimited messaging, up to 10 profile images, audio & video links, access to booker contact details, Pro badge for credibility, and priority customer support.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className={cn("pt-6", isNativeApp && "pt-4 px-4 pb-4")}>
              <h3 className={cn("font-semibold mb-2", isNativeApp && "text-sm")}>Can I cancel my Pro subscription?</h3>
              <p className={cn("text-muted-foreground", isNativeApp && "text-xs leading-relaxed")}>
                Yes, you can cancel anytime through your PayPal account or dashboard. You'll continue to have Pro benefits until the end of your billing period, then revert to the free plan.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className={cn("pt-6", isNativeApp && "pt-4 px-4 pb-4")}>
              <h3 className={cn("font-semibold mb-2", isNativeApp && "text-sm")}>How does messaging work for free vs Pro users?</h3>
              <p className={cn("text-muted-foreground", isNativeApp && "text-xs leading-relaxed")}>
                Free users have filtered messaging with limited booking requests per month. Pro users get unlimited messaging and can see full booker contact details.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className={cn("pt-6", isNativeApp && "pt-4 px-4 pb-4")}>
              <h3 className={cn("font-semibold mb-2", isNativeApp && "text-sm")}>What's the difference between free and Pro profiles?</h3>
              <p className={cn("text-muted-foreground", isNativeApp && "text-xs leading-relaxed")}>
                Free profiles have 1 image and basic visibility. Pro profiles feature up to 10 images, audio/video links, Pro badge, and featured placement in our Pro Artists section.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Subscription Modal - Pass the selected billing cycle */}
      <SubscriptionModal 
        open={showSubscriptionModal} 
        onOpenChange={setShowSubscriptionModal}
        initialPlan={billingCycle} // Pre-select the plan based on billing cycle
      />
    </div>
  );
}