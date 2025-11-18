import { useState } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface DeleteAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountModal({
  open,
  onOpenChange,
}: DeleteAccountModalProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [showFinalConfirmation, setShowFinalConfirmation] = useState(false);
  const isNativeApp = Capacitor.isNativePlatform();

  const requiredText = "DELETE";
  const isConfirmationValid = confirmationText === requiredText;

  // ADD THIS: Debug render
  console.log("🔍 DeleteAccountModal render:", {
    open,
    showFinalConfirmation,
    isConfirmationValid,
    confirmationText,
    isDeleting,
    user: user?.id,
  });

  const handleDeleteAccount = async () => {
    console.log("🔴🔴🔴 handleDeleteAccount CALLED - FIRST LINE ��🔴��");
    console.log("User:", user);
    console.log("Confirmation text:", confirmationText);
    console.log("Is confirmation valid:", isConfirmationValid);

    if (!user) {
      console.error("❌ No user found");
      toast({
        title: "Error",
        description: "User not found. Please try signing in again.",
        variant: "destructive",
      });
      return;
    }

    if (!isConfirmationValid) {
      console.error("❌ Confirmation text invalid");
      toast({
        title: "Confirmation Required",
        description: `Please type "DELETE" to confirm account deletion.`,
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    console.log("✅ setIsDeleting(true) called");

    try {
      console.log("🚀 Starting account deletion for user:", user.id);
      console.log(
        "📡 About to call supabase.rpc('user_delete_own_account')..."
      );

      // Call Database RPC Function instead of Edge Function
      const { data, error } = await supabase.rpc("user_delete_own_account");

      console.log("📥 Function response received!");
      console.log("Response data:", JSON.stringify(data, null, 2));
      console.log("Response error:", JSON.stringify(error, null, 2));

      if (error) {
        console.error("❌ Function invocation error:", error);
        console.error("Error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw new Error(error.message || "Failed to delete account");
      }

      if (!data) {
        console.error("❌ No data in response");
        throw new Error("No response from server");
      }

      if (data.success === false) {
        console.error("❌ Function returned success: false", data);
        throw new Error(
          data.error || data.details || "Failed to delete account"
        );
      }

      console.log("✅ Account deletion successful");

      // Close modal first
      setShowFinalConfirmation(false);
      onOpenChange(false);

      // Show success toast
      toast({
        title: "Account Deleted Successfully",
        description:
          "Your account and all associated data have been permanently deleted.",
        duration: 3000,
      });

      // Sign out
      try {
        await signOut();
      } catch (signOutError) {
        console.log(
          "Sign out error (expected after account deletion):",
          signOutError
        );
      }

      // Navigate to home page
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (error: any) {
      console.error("❌❌❌ CATCH BLOCK - Error deleting account:", error);
      console.error("Error type:", typeof error);
      console.error("Error name:", error?.name);
      console.error("Error message:", error?.message);
      console.error("Error stack:", error?.stack);
      console.error("Full error object:", JSON.stringify(error, null, 2));

      setIsDeleting(false);

      const errorMessage =
        error?.message ||
        error?.error ||
        "We couldn't delete your account. Please try again or contact support.";

      toast({
        title: "Deletion Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 7000,
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    console.log("🔍 handleOpenChange called:", {
      newOpen,
      isDeleting,
      showFinalConfirmation,
    });
    if (!isDeleting) {
      // If we're opening the second dialog, don't close the first one yet
      if (!newOpen && showFinalConfirmation) {
        console.log("Second dialog is open, keeping first dialog state");
        return;
      }
      onOpenChange(newOpen);
      if (!newOpen) {
        setConfirmationText("");
        setShowFinalConfirmation(false);
      }
    }
  };

  return (
    <>
      {/* Remove test button - it's not needed */}
      
      <AlertDialog
        open={open && !showFinalConfirmation}
        onOpenChange={handleOpenChange}
      >
        <AlertDialogContent
          className={cn(
            // Native app: compact, smaller, fits screen
            isNativeApp && "max-w-[calc(100vw-1.5rem)] rounded-xl max-h-[80vh]"
          )}
        >
          <AlertDialogHeader className={cn(isNativeApp && "pb-1 space-y-1")}>
            <div className={cn("flex items-center gap-2", isNativeApp && "gap-1.5 mb-0")}>
              <div
                className={cn(
                  "rounded-full p-2 bg-destructive/10 flex-shrink-0",
                  isNativeApp && "p-1.5"
                )}
              >
                <AlertTriangle
                  className={cn(
                    "text-destructive",
                    isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4"
                  )}
                />
              </div>
              <AlertDialogTitle
                className={cn(
                  isNativeApp ? "text-sm font-semibold leading-tight" : ""
                )}
              >
                Delete Account
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription
              className={cn(
                isNativeApp ? "text-[10px] leading-tight mt-0.5" : ""
              )}
            >
              Are you sure you want to delete your account? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className={cn("space-y-3", isNativeApp && "space-y-1.5 py-0.5")}>
            <div
              className={cn(
                "p-4 rounded-lg border-2",
                isNativeApp
                  ? "p-2 rounded-lg border-destructive/30 bg-destructive/5"
                  : "bg-destructive/5 border-destructive/20"
              )}
            >
              <p
                className={cn(
                  "font-semibold mb-2 text-destructive",
                  isNativeApp ? "text-[10px] mb-1 font-medium" : "text-sm"
                )}
              >
                This will permanently delete:
              </p>
              <ul
                className={cn(
                  "space-y-1.5 text-muted-foreground",
                  isNativeApp ? "text-[9px] leading-tight space-y-0.5" : "text-sm"
                )}
              >
                <li>• Your account and credentials</li>
                <li>• Your profile and all profile data</li>
                <li>• All your bookings and event requests</li>
                <li>• All your messages and conversations</li>
                <li>• All your notifications</li>
                <li>• Any uploaded files and media</li>
              </ul>
            </div>
          </div>

          <AlertDialogFooter
            className={cn(
              isNativeApp && "flex-col gap-1.5 sm:flex-row pt-1 mt-1"
            )}
          >
            <AlertDialogCancel
              disabled={isDeleting}
              className={cn(
                isNativeApp &&
                  "w-full sm:w-auto h-9 text-xs font-medium rounded-lg order-2"
              )}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              onClick={(e) => {
                console.log("🔵 First dialog Continue button clicked");
                e.preventDefault();
                e.stopPropagation();
                setShowFinalConfirmation(true);
              }}
              disabled={isDeleting}
              variant="destructive"
              className={cn(
                "w-full sm:w-auto",
                isNativeApp &&
                  "h-9 text-xs font-medium rounded-lg active:scale-[0.98] transition-transform order-1"
              )}
            >
              Continue
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Final Confirmation Dialog */}
      <AlertDialog
        open={showFinalConfirmation}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setShowFinalConfirmation(open);
            if (!open) {
              setConfirmationText("");
            }
          }
        }}
      >
        <AlertDialogContent
          className={cn(
            // Native app: compact, smaller, fits screen
            isNativeApp && "max-w-[calc(100vw-1.5rem)] rounded-xl max-h-[80vh]"
          )}
        >
          <AlertDialogHeader className={cn(isNativeApp && "pb-1 space-y-1")}>
            <div className={cn("flex items-center gap-2", isNativeApp && "gap-1.5 mb-0")}>
              <div
                className={cn(
                  "rounded-full p-2 bg-destructive/10 flex-shrink-0",
                  isNativeApp && "p-1.5"
                )}
              >
                <Trash2
                  className={cn(
                    "text-destructive",
                    isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4"
                  )}
                />
              </div>
              <AlertDialogTitle
                className={cn(
                  isNativeApp ? "text-sm font-semibold leading-tight" : ""
                )}
              >
                Final Confirmation
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription
              className={cn(
                isNativeApp ? "text-[10px] leading-tight mt-0.5" : ""
              )}
            >
              This is your last chance to cancel. Type{" "}
              <strong>"{requiredText}"</strong> to confirm account deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className={cn("space-y-3", isNativeApp && "space-y-1.5 py-0.5")}>
            <div className="space-y-2">
              <Label
                htmlFor="confirmation"
                className={cn(isNativeApp && "text-[10px] font-medium")}
              >
                Type "{requiredText}" to confirm:
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => {
                  console.log("📝 Input changed:", e.target.value);
                  setConfirmationText(e.target.value);
                }}
                placeholder={requiredText}
                disabled={isDeleting}
                className={cn(
                  "font-mono",
                  isNativeApp && "h-9 text-xs"
                )}
                autoFocus
              />
            </div>
          </div>

          <AlertDialogFooter
            className={cn(
              isNativeApp && "flex-col gap-1.5 sm:flex-row pt-1 mt-1"
            )}
          >
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={() => {
                console.log("❌ Cancel button clicked");
                setShowFinalConfirmation(false);
                setConfirmationText("");
              }}
              className={cn(
                isNativeApp &&
                  "w-full sm:w-auto h-9 text-xs font-medium rounded-lg order-2"
              )}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                console.log("🔵🔵🔵 FINAL CONFIRMATION BUTTON CLICKED!");
                e.preventDefault();
                e.stopPropagation();

                if (!isConfirmationValid) {
                  toast({
                    title: "Confirmation Required",
                    description: `Please type "${requiredText}" exactly to confirm.`,
                    variant: "destructive",
                  });
                  return;
                }

                if (isDeleting) {
                  return;
                }

                handleDeleteAccount();
              }}
              disabled={!isConfirmationValid || isDeleting}
              className={cn(
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                isNativeApp &&
                  "w-full sm:w-auto h-9 text-xs font-medium rounded-lg active:scale-[0.98] transition-transform order-1"
              )}
            >
              {isDeleting ? (
                <>
                  <Loader2
                    className={cn(
                      "mr-2 animate-spin",
                      isNativeApp ? "h-3 w-3" : "h-4 w-4"
                    )}
                  />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2
                    className={cn("mr-2", isNativeApp ? "h-3 w-3" : "h-4 w-4")}
                  />
                  Delete Account Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
