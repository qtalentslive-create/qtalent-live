import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Zap, Users, MessageSquare, Calendar, Shield, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";

export default function () {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNativeApp = Capacitor.isNativePlatform();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const talentPlans = [
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
    },
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
      savings: "Save $20 on every $100 earned!"
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
      <section id="upgrade-to-pro" className={cn("container mx-auto px-4", isNativeApp ? "mb-12" : "mb-20")}>
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