// FILE: src/pages/Auth.tsx
// (Corrected version: Removed all push notification logic)

import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { useAutoScrollOnInput } from "@/hooks/useAutoScrollOnInput";
import { Capacitor } from "@capacitor/core";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
// import { registerDeviceForNotifications } from "@/hooks/usePushNotifications"; // 👈 REMOVED

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [authMethod, setAuthMethod] = useState<"password" | "magiclink">(
    "password"
  );
  const [autoSignInPending, setAutoSignInPending] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { sendUserSignupEmails } = useEmailNotifications();

  // Refs for auto-scroll functionality
  const loginSubmitButtonRef = useRef<HTMLButtonElement>(null);
  const signupSubmitButtonRef = useRef<HTMLButtonElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  
  // Refs for autofill detection
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const autoSubmitAttemptedRef = useRef(false);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll when inputs are focused - use the active tab's submit button
  // GENTLE auto-scrolling: small scroll to show next field, not aggressive
  useAutoScrollOnInput({
    submitButtonRef: activeTab === "login" ? loginSubmitButtonRef : signupSubmitButtonRef,
    formRef: formCardRef,
    enabled: true,
    scrollDelay: Capacitor.isNativePlatform() ? 300 : 200, // Shorter delay for more responsive gentle scrolling
    bottomOffset: Capacitor.isNativePlatform() ? 160 : 120, // Offset for keyboard (used for calculations only)
  });

  const { state } = useLocation();
  const mode = state?.mode || "booker";
  const verificationMessage = state?.message; // Email verification message from redirect

  const title = mode === "booker" ? "Welcome to Qtalent" : "Talent Access";
  const description = "Sign in or create an account with a magic link.";

  // Get intent from state to show appropriate messaging
  const intent = state?.intent;
  const intentMessage =
    intent === "booking-form"
      ? "Sign in to complete your booking request"
      : intent === "event-form"
      ? "Sign in to get personalized recommendations"
      : null;

  // Store intent in localStorage when component mounts
  useEffect(() => {
    if (intent) {
      localStorage.setItem("authIntent", intent);
    }
  }, [intent]);

  useEffect(() => {
    if (!authLoading && user) {
      // 🔐 Check sessionStorage flag for password recovery
      const isPasswordRecovery =
        sessionStorage.getItem("isPasswordRecovery") === "true";

      if (isPasswordRecovery) {
        console.log(
          "[Auth] Password recovery flag detected - skipping redirect"
        );
        return;
      }

      // Redirect users away from auth pages
      if (window.location.pathname.startsWith("/auth")) {
        navigate("/");
      }
    }
  }, [user, authLoading, navigate]);

  // Auto-submit on biometric autofill (Capacitor only)
  useEffect(() => {
    const isNativeApp = Capacitor.isNativePlatform();
    
    // Only auto-submit on native app, login tab, password method
    if (!isNativeApp || activeTab !== "login" || authMethod !== "password" || loading) {
      if (!loading && autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
        autoSubmitTimerRef.current = null;
        setAutoSignInPending(false);
      }
      return;
    }

    // Check if both email and password are filled
    const emailFilled = email.trim().length > 0 && email.includes("@");
    const passwordFilled = password.trim().length >= 6;

    // Auto-submit if both fields are filled and we haven't attempted yet
    if (emailFilled && passwordFilled && !autoSubmitAttemptedRef.current) {
      autoSubmitAttemptedRef.current = true;
      setAutoSignInPending(true);
      
      // Small delay to ensure autofill is complete
      autoSubmitTimerRef.current = setTimeout(() => {
        autoSubmitTimerRef.current = null;
        console.log("[Auth] Auto-submitting after biometric autofill");
        handleAuthAction(false);
      }, 500); // 500ms delay to ensure autofill is complete
    }

    return () => {
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
        autoSubmitTimerRef.current = null;
        setAutoSignInPending(false);
      }
    };
  }, [email, password, activeTab, authMethod, loading]);

  // Reset auto-submit flag when tab/method changes or fields are cleared
  useEffect(() => {
    if (
      activeTab !== "login" ||
      authMethod !== "password" ||
      (!email && !password)
    ) {
      autoSubmitAttemptedRef.current = false;
      setAutoSignInPending(false);
    }
  }, [activeTab, authMethod, email, password]);

  // Reset auto-submit flag when loading completes and fields are cleared (allows retry)
  useEffect(() => {
    // Only reset if fields are cleared (user manually cleared them to retry)
    if (!loading && autoSubmitAttemptedRef.current && activeTab === "login" && !email && !password) {
      autoSubmitAttemptedRef.current = false;
      setAutoSignInPending(false);
    }
  }, [loading, activeTab, email, password]);

  const handleAuthAction = async (isSignUp: boolean) => {
    setLoading(true);
    const userType = mode === "booker" ? "booker" : "talent";

    if (isSignUp && !name) {
      toast({
        title: "Name is required",
        description: "Please enter your full name to sign up.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Signup ALWAYS requires password
    if (isSignUp && (!password || password.length < 6)) {
      toast({
        title: "Password required",
        description: "Password must be at least 6 characters for signup.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Signin with password method requires password
    if (
      !isSignUp &&
      authMethod === "password" &&
      (!password || password.length < 6)
    ) {
      toast({
        title: "Password required",
        description: "Please enter your password (minimum 6 characters).",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      // Check email via edge function
      const { data: emailCheck } = await supabase.functions.invoke(
        "check-email-exists",
        {
          body: { email: email.toLowerCase().trim() },
        }
      );

      // For sign up - check if user exists
      if (isSignUp && emailCheck?.exists) {
        toast({
          title: "Account already exists! 🔑",
          description:
            "This email is already registered. Please switch to 'Sign In' tab to access your account.",
          variant: "destructive",
          duration: 6000,
        });
        setLoading(false);
        return;
      }

      // For sign in - check if user doesn't exist
      if (!isSignUp && !emailCheck?.exists) {
        toast({
          title: "Account not found 🔍",
          description:
            "No account found with this email. Please switch to 'Sign Up' tab to create an account.",
          variant: "destructive",
          duration: 6000,
        });
        setLoading(false);
        return;
      }

      let error: unknown = null;

      if (isSignUp) {
        // Signup with minimal metadata
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email: email.toLowerCase().trim(),
            password: password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
              data: { name: name, user_type: userType },
            },
          });
        error = signUpError;

        if (!error && signUpData.user) {
          // registerDeviceForNotifications(signUpData.user.id); // 👈 REMOVED

          // Send welcome emails in background (non-blocking)
          sendUserSignupEmails(
            signUpData.user.id,
            name,
            email.toLowerCase().trim()
          ).catch((err) => console.error("Failed to send welcome email:", err));

          // Check for event-form intent and redirect accordingly
          const authIntent = localStorage.getItem("authIntent");
          const bookingIntent = localStorage.getItem("bookingIntent");

          toast({
            title: "🎉 Welcome to Qtalent!",
            description:
              authIntent === "event-form"
                ? "Redirecting you to find the perfect talent for your event..."
                : bookingIntent
                ? `Redirecting you to book ${
                    JSON.parse(bookingIntent).talentName
                  }...`
                : "Redirecting you to your dashboard...",
            duration: 3000,
          });

          setTimeout(() => {
            if (authIntent === "event-form") {
              localStorage.removeItem("authIntent");
              navigate("/your-event", { replace: true });
            } else if (bookingIntent) {
              const { talentId } = JSON.parse(bookingIntent);
              localStorage.removeItem("bookingIntent");
              navigate(`/talent/${talentId}`, {
                state: { openBookingForm: true },
                replace: true,
              });
            } else {
              navigate(state?.from?.pathname || "/", { replace: true });
            }
          }, 1000);
        }
      } else {
        // Signin can use password OR magic link
        if (authMethod === "password") {
          const { error: signInError } = await supabase.auth.signInWithPassword(
            {
              email: email.toLowerCase().trim(),
              password: password,
            }
          );
          error = signInError;

          if (!error) {
            //
            // ▼▼▼ THIS BLOCK WAS REMOVED ▼▼▼
            //
            // const {
            //   data: { user },
            // } = await supabase.auth.getUser();
            // if (user) {
            //   registerDeviceForNotifications(user.id);
            // }
            //
            // ▲▲▲ THIS BLOCK WAS REMOVED ▲▲▲
            //

            // Check for event-form intent and redirect accordingly
            const authIntent = localStorage.getItem("authIntent");
            const bookingIntent = localStorage.getItem("bookingIntent");

            if (authIntent === "event-form") {
              localStorage.removeItem("authIntent");
              toast({
                title: "Welcome! 🎉",
                description: "Let's find the perfect talent for your event.",
                duration: 4000,
              });
              setTimeout(
                () => navigate("/your-event", { replace: true }),
                1000
              );
            } else if (bookingIntent) {
              const { talentId, talentName } = JSON.parse(bookingIntent);
              localStorage.removeItem("bookingIntent");
              toast({
                title: "Welcome back! 👋",
                description: `Let's book ${talentName} for your event.`,
                duration: 4000,
              });
              setTimeout(
                () =>
                  navigate(`/talent/${talentId}`, {
                    state: { openBookingForm: true },
                    replace: true,
                  }),
                1000
              );
            } else {
              toast({
                title: "Welcome back! 👋",
                description: "You're now signed in. Redirecting...",
                duration: 3000,
              });
              setTimeout(() => navigate(state?.from?.pathname || "/"), 1000);
            }
          }
        } else {
          // Magic link for signin only
          const redirectTo = `${window.location.origin}/auth/callback`;

          const { error: otpError } = await supabase.auth.signInWithOtp({
            email: email.toLowerCase().trim(),
            options: {
              emailRedirectTo: redirectTo,
            },
          });
          error = otpError;

          if (!error) {
            toast({
              title: "Check your email! 📧",
              description:
                "Magic link sent! Check your inbox and spam folder (may take 1-2 minutes).",
              duration: 8000,
            });
            setEmailSent(true);
          }
        }
      }

      if (error) {
        console.error("Auth error:", error);
        let errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        let errorTitle = "Authentication failed";

        if (error instanceof Error) {
          if (error.message.includes("Invalid login credentials")) {
            errorTitle = "Incorrect password 🔒";
            errorMessage =
              "The password you entered is incorrect. Please try again.";
          } else if (error.message.includes("Email not confirmed")) {
            errorTitle = "Email not verified 📧";
            errorMessage =
              "Please check your email and click the verification link first.";
          } else if (error.message.includes("already registered")) {
            errorTitle = "Account exists! 🔑";
            errorMessage =
              "This email is already registered. Use 'Sign In' tab instead.";
          }
        }

        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
          duration: 6000,
        });
      }
    } catch (error: unknown) {
      console.error("Unexpected auth error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setAutoSignInPending(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <Mail className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">📧 Check Your Email</h1>
          <div className="space-y-2">
            <p className="text-muted-foreground">
              A magic link has been sent to
            </p>
            <p className="font-semibold text-lg">{email}</p>
          </div>
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 text-left">
            <p className="text-sm font-medium mb-2">💡 What to do next:</p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Check your inbox and spam folder</li>
              <li>The email may take 1-2 minutes to arrive</li>
              <li>Click the link to complete sign in</li>
              <li>
                If you already have an account, you'll be signed in
                automatically
              </li>
            </ul>
          </div>

          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mt-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const isNativeApp = Capacitor.isNativePlatform();

  return (
    <div 
      className={cn(
        "min-h-screen bg-background flex items-center justify-center p-4",
        isNativeApp && "pb-[calc(4rem+env(safe-area-inset-bottom))]"
      )}
      ref={formContainerRef}
    >
      <div className="w-full max-w-md">
        <Button
          type="button"
          variant="ghost"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
        <Card ref={formCardRef}>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>

            {/* Email Verification Message */}
            {verificationMessage && (
              <div className="mt-4 space-y-3">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        📧 Email Verification Required
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        {verificationMessage}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                        After verifying your email, return here to sign in.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resend Verification Email Button */}
                {state?.showResendButton && state?.email && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        setLoading(true);
                        const { error } = await supabase.auth.resend({
                          type: "signup",
                          email: state.email,
                        });

                        if (error) throw error;

                        toast({
                          title: "Email Resent! 📧",
                          description:
                            "Check your inbox again. It may take a few minutes to arrive.",
                          duration: 5000,
                        });
                      } catch (error: unknown) {
                        toast({
                          title: "Error",
                          description:
                            error instanceof Error
                              ? error.message
                              : "Failed to resend email.",
                          variant: "destructive",
                        });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? "Sending..." : "Resend Verification Email"}
                  </Button>
                )}
              </div>
            )}

            {intentMessage && !verificationMessage && (
              <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm font-medium text-primary mb-2">
                  {intentMessage}
                </p>
                <p className="text-xs text-muted-foreground">
                  ✨ <strong>New here?</strong> Switch to the "Sign Up" tab to
                  create your account first!
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Tabs 
              defaultValue="login" 
              className="w-full"
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as "login" | "signup")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAuthAction(false);
                  }}
                  className="space-y-4 pt-4"
                >
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                  {isNativeApp && autoSignInPending && (
                    <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Signing you in securely…</span>
                    </div>
                  )}

                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        Sign In Method
                      </Label>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            authMethod === "password" ? "default" : "outline"
                          }
                          onClick={() => setAuthMethod("password")}
                          className="text-xs is-small-toggle"
                        >
                          🔑 Password
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            authMethod === "magiclink" ? "default" : "outline"
                          }
                          onClick={() => setAuthMethod("magiclink")}
                          className="text-xs is-small-toggle"
                        >
                          ✉️ Magic Link
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      ref={emailInputRef}
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  {authMethod === "password" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Password</Label>

                        <button
                          type="button"
                          onClick={() => navigate("/reset-password")}
                          className="auth-link text-xs"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <Input
                        ref={passwordInputRef}
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    💡{" "}
                    {authMethod === "password"
                      ? "Enter your password to sign in"
                      : "We'll send a magic link to your email"}
                    . New here? Switch to "Sign Up" tab
                  </p>

                  <Button 
                    ref={loginSubmitButtonRef}
                    type="submit" 
                    disabled={loading} 
                    className="w-full"
                  >
                    {loading
                      ? "Signing In..."
                      : authMethod === "password"
                      ? "Sign In"
                      : "Send Magic Link"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAuthAction(true);
                  }}
                  className="space-y-4 pt-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      autoComplete="name"
                      placeholder="Your Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum 6 characters required
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    💡 Create a secure password to access your account. Already
                    registered? Use "Sign In" tab
                  </p>

                  <Button 
                    ref={signupSubmitButtonRef}
                    type="submit" 
                    disabled={loading} 
                    className="w-full"
                  >
                    {loading ? "Welcome! 🎉" : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      {/* Native app sticky footer bar for safe area */}
      {isNativeApp && <div className="native-footer-bar" />}
    </div>
  );
};

export default Auth;
