// FILE: src/pages/UpdatePassword.tsx
// Simplified version that handles tokens directly
import { useState, useEffect, FormEvent, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAutoScrollOnInput } from "@/hooks/useAutoScrollOnInput";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

const UpdatePassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);

  useAutoScrollOnInput({
    submitButtonRef: submitButtonRef,
    formRef: formCardRef,
    enabled: true,
  });

  useEffect(() => {
    const processRecovery = async () => {
      try {
        // Check if we have tokens in the URL hash
        const hash = window.location.hash;

        console.log("[UpdatePassword] Hash present:", !!hash);
        console.log(
          "[UpdatePassword] Hash contains recovery:",
          hash.includes("type=recovery")
        );

        if (hash && hash.includes("access_token")) {
          // Parse tokens from hash
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          const type = hashParams.get("type");

          console.log("[UpdatePassword] Token type:", type);
          console.log("[UpdatePassword] Has access token:", !!accessToken);
          console.log("[UpdatePassword] Has refresh token:", !!refreshToken);

          if (accessToken && refreshToken) {
            // Set the session with the tokens
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error("[UpdatePassword] Session error:", sessionError);
              setError(
                "Invalid or expired reset link. Please request a new one."
              );
              setVerifying(false);
              return;
            }

            console.log("[UpdatePassword] Session set successfully!");
            // Clear the hash from URL for cleaner display
            window.history.replaceState(null, "", window.location.pathname);
            setVerifying(false);
            return;
          }
        }

        // No tokens in URL - check if we already have a session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          console.log("[UpdatePassword] Existing session found");
          setVerifying(false);
          return;
        }

        // No tokens and no session
        console.log("[UpdatePassword] No tokens or session found");
        setError(
          "No valid reset link found. Please request a new password reset."
        );
        setVerifying(false);
      } catch (err) {
        console.error("[UpdatePassword] Error:", err);
        setError("An error occurred. Please try again.");
        setVerifying(false);
      }
    };

    processRecovery();
  }, []);

  const handleUpdatePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      console.error("[UpdatePassword] Update error:", updateError);
      toast({
        title: "Update Failed",
        description: updateError.message || "Could not update password.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setSuccess(true);
    toast({
      title: "Password Updated! ✅",
      description: "You can now sign in with your new password.",
    });

    setTimeout(() => navigate("/auth"), 2000);
  };

  // Loading state
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Verifying Reset Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Please wait...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Reset Link Issue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 rounded-md p-3 text-sm bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
            <Button
              onClick={() => navigate("/reset-password")}
              className="w-full"
            >
              Request New Reset Link
            </Button>
            <Button
              onClick={() => navigate("/auth")}
              variant="outline"
              className="w-full"
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Password Updated!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="text-muted-foreground">Redirecting to sign in...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password form
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card ref={formCardRef}>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Set New Password</CardTitle>
            <CardDescription>
              Enter your new password below (minimum 6 characters)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <Button
                ref={submitButtonRef}
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UpdatePassword;
