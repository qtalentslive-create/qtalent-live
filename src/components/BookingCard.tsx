// FILE: src/components/BookingCard.tsx

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  Check,
  X,
  Clock3,
  MessageCircle,
  Crown,
  Trash2,
  Headset,
  HelpCircle,
  Mail,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useChat } from "@/contexts/ChatContext";
import { useTalentBookingLimit } from "@/hooks/useTalentBookingLimit";
import { useNavigate } from "react-router-dom";
import { useIndividualUnreadCount } from "@/hooks/useIndividualUnreadCount";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";

export interface Booking {
  id: string;
  booker_name: string;
  booker_email?: string;
  booker_phone?: string;
  event_date: string;
  event_duration: number;
  event_location: string;
  event_address: string;
  description?: string;
  status: string;
  user_id: string;
  talent_id?: string;
  talent_profiles?: { artist_name: string };
  event_type: string;
}

interface BookingCardProps {
  booking: Booking;
  mode: "talent" | "booker" | "admin";
  onUpdate?: () => void;
  onRemove?: (bookingId: string) => void;
  shouldBlurContact?: boolean;
}

export const BookingCard = ({
  booking,
  mode,
  onUpdate,
  onRemove,
  shouldBlurContact = false,
}: BookingCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { openChat } = useChat();
  const { canReceiveBooking, isProUser } = useTalentBookingLimit();
  const { unreadCount } = useIndividualUnreadCount(booking.id, "booking");
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<"accepted" | "declined" | null>(null);
  const isNativeApp = Capacitor.isNativePlatform();

  // Safety check
  if (!booking) return null;
  const isTalentPendingResponse =
    mode === "talent" &&
    (booking.status === "pending" || booking.status === "pending_approval");
  const canTalentChat = mode !== "talent" || !isTalentPendingResponse;

  const handleRemove = async () => {
    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", booking.id);
      if (error) throw new Error(error.message);
      toast({ title: "Booking removed" });
      setShowRemoveDialog(false);
      onRemove?.(booking.id);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (
    status: string
  ): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case "confirmed":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
      case "declined":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Check if this is an admin support chat
  const isAdminSupport = booking.event_type === "admin_support";

  const updateTalentBookingStatus = async (
    nextStatus: "accepted" | "declined"
  ) => {
    try {
      setStatusUpdating(nextStatus);
      const { error } = await supabase
        .from("bookings")
        .update({ status: nextStatus })
        .eq("id", booking.id);
      if (error) throw error;

      toast({
        title:
          nextStatus === "accepted"
            ? "Booking accepted"
            : "Booking declined",
        description:
          nextStatus === "accepted"
            ? "Chat unlocked with this booker."
            : "The booking was removed from your dashboard.",
      });

      if (nextStatus === "declined") {
        onRemove?.(booking.id);
      } else {
        await openChat(booking.id, "booking");
      }

      onUpdate?.();
    } catch (error: any) {
      const description =
        error?.message || "Unable to update booking status right now.";
      toast({
        title: "Update failed",
        description,
        variant: "destructive",
      });
    } finally {
      setStatusUpdating(null);
    }
  };

  // Render special card for admin support
  if (isAdminSupport) {
    return (
      <div
        className={cn(
          "border-2 border-primary/30 rounded-lg bg-gradient-to-br from-primary/5 via-primary/3 to-background space-y-3 transition-all",
          isNativeApp
            ? "p-3 border"
            : "p-5 hover:shadow-lg hover:border-primary/50"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center",
              isNativeApp ? "w-10 h-10" : "w-12 h-12"
            )}
          >
            <Headset
              className={cn(
                "text-primary",
                isNativeApp ? "h-5 w-5" : "h-6 w-6"
              )}
            />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={cn(
                  "font-bold text-foreground",
                  isNativeApp ? "text-base" : "text-lg"
                )}
              >
                QTalents Support Chat
              </h3>
              <Badge
                variant="outline"
                className={cn(
                  "bg-primary/10 text-primary border-primary/30",
                  isNativeApp ? "text-xs px-1.5 py-0" : ""
                )}
              >
                Live Support
              </Badge>
            </div>
            <p
              className={cn(
                "text-muted-foreground leading-relaxed",
                isNativeApp ? "text-xs" : "text-sm"
              )}
            >
              Need help or have questions? Our support team is here to assist
              you. Chat with us directly and we'll respond as soon as possible.
            </p>
          </div>
        </div>

        <div
          className={cn(
            "border-t border-primary/10 space-y-2",
            isNativeApp ? "pt-2" : "pt-3"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 text-muted-foreground",
              isNativeApp ? "text-xs" : "text-sm"
            )}
          >
            <HelpCircle
              className={cn(
                "text-primary",
                isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4"
              )}
            />
            <span>Typical response time: Within 24 hours</span>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 text-muted-foreground",
              isNativeApp ? "text-xs" : "text-sm"
            )}
          >
            <MessageCircle
              className={cn(
                "text-primary",
                isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4"
              )}
            />
            <span>
              Available for questions, technical support, or booking assistance
            </span>
          </div>
        </div>

        <div
          className={cn(
            "border-t border-primary/10",
            isNativeApp ? "pt-2" : "pt-2"
          )}
        >
          <Button
            onClick={() => openChat(booking.id, "booking")}
            className={cn(
              "w-full dashboard-card-button",
              isNativeApp ? "h-9 text-sm" : ""
            )}
            size={isNativeApp ? "default" : "lg"}
          >
            <MessageCircle
              className={cn("mr-2", isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4")}
            />
            Start Support Chat
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className={cn(
                  "ml-2 flex items-center justify-center text-xs animate-pulse",
                  isNativeApp ? "h-4 w-4 p-0" : "h-5 w-5 p-0"
                )}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Regular booking card
  return (
    <div
      className={cn(
        "rounded-xl bg-card text-card-foreground transition-all w-full",
        isNativeApp
          ? "p-3 shadow-sm border border-border/50 bg-gradient-to-br from-card to-card/95"
          : "p-4 hover:shadow-md border rounded-lg"
      )}
    >
      {/* Header Section - More Compact */}
      <div
        className={cn(
          "flex justify-between items-start gap-2",
          isNativeApp ? "mb-2" : ""
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className={cn(
                "rounded-lg flex items-center justify-center",
                isNativeApp ? "w-8 h-8 bg-primary/10" : ""
              )}
            >
              <Calendar
                className={cn(
                  isNativeApp
                    ? "h-4 w-4 text-primary"
                    : "mr-1.5 h-3.5 w-3.5 text-muted-foreground"
                )}
              />
            </div>
            <h3
              className={cn(
                "font-bold capitalize text-foreground",
                isNativeApp ? "text-sm leading-tight" : "font-semibold"
              )}
            >
              {booking.event_type}
            </h3>
            {booking.status !== "pending" && isNativeApp && (
              <Badge
                variant={getStatusBadgeVariant(booking.status)}
                className="text-[10px] px-1.5 py-0.5 h-5 font-semibold"
              >
                {booking.status}
              </Badge>
            )}
          </div>

          {/* Compact Info Row */}
          {isNativeApp && (
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground ml-10">
              <div className="flex items-center gap-1">
                <Clock3 className="h-3 w-3" />
                <span>{format(new Date(booking.event_date), "MMM d")}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>•</span>
                <span>{booking.event_duration}h</span>
              </div>
              {mode === "talent" && (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <span>•</span>
                  <span className="truncate">{booking.booker_name}</span>
                </div>
              )}
            </div>
          )}

          {/* Web version stays the same */}
          {!isNativeApp && (
            <>
              <div
                className={cn(
                  "text-muted-foreground flex items-center",
                  "text-sm"
                )}
              >
                <Calendar className={cn("mr-1.5 flex-shrink-0", "h-4 w-4")} />
                <span className="truncate">
                  {booking.event_date
                    ? format(new Date(booking.event_date), "PPP")
                    : "No date"}
                </span>
              </div>
              <div
                className={cn(
                  "text-muted-foreground flex items-center",
                  "text-sm"
                )}
              >
                <Clock3 className={cn("mr-1.5 flex-shrink-0", "h-4 w-4")} />
                {booking.event_duration} hours
              </div>
            </>
          )}
        </div>
        {booking.status !== "pending" && !isNativeApp && (
          <Badge
            variant={getStatusBadgeVariant(booking.status)}
            className={cn("capitalize flex-shrink-0", "")}
          >
            {booking.status}
          </Badge>
        )}
      </div>

      {/* Content Section - More Compact for Native */}
      {isNativeApp ? (
        <div className="space-y-2.5">
          {/* Contact Info - Compact Grid */}
          {(mode === "talent" ||
            (mode === "booker" && booking.talent_profiles)) && (
            <div className="bg-muted/40 rounded-lg p-2.5 space-y-1.5">
              {mode === "talent" ? (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Booker
                  </span>
                  <span
                    className={cn(
                      "text-xs font-semibold text-foreground truncate flex-1 text-right ml-2",
                      shouldBlurContact && !isProUser && "blur-sm"
                    )}
                  >
                    {booking.booker_name}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Talent
                  </span>
                  <span className="text-xs font-semibold text-foreground truncate flex-1 text-right ml-2">
                    {booking.talent_profiles?.artist_name || "N/A"}
                  </span>
                </div>
              )}

              {booking.booker_email && mode !== "booker" && (
                <div className="flex items-center justify-between">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span
                    className={cn(
                      "text-[11px] text-muted-foreground truncate flex-1 text-right ml-2",
                      mode === "talent" &&
                        shouldBlurContact &&
                        !isProUser &&
                        "blur-sm"
                    )}
                  >
                    {booking.booker_email}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Location - Compact */}
          <div className="flex items-start gap-2">
            <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">
                Location
              </p>
              <p className="text-xs text-foreground leading-tight">
                {booking.event_location}
              </p>
            </div>
          </div>

          {/* Pro Upgrade Banner - More Compact */}
          {mode === "talent" &&
            shouldBlurContact &&
            !isProUser &&
            (booking.booker_email || booking.booker_phone) && (
              <div className="bg-primary/10 rounded-lg p-2 border border-primary/20">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Crown className="h-3 w-3 text-primary" />
                  <p className="text-[10px] font-semibold text-primary">
                    Unlock Contact Details
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate("/pricing")}
                  className="w-full h-7 text-[10px] font-semibold"
                  variant="default"
                >
                  Upgrade to Pro
                </Button>
              </div>
            )}

          {/* Action Button - Compact Design for Native */}
          {mode === "talent" && isTalentPendingResponse && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground">
                Accept to unlock the chat or decline to dismiss this booking.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-[11px]"
                  onClick={() => updateTalentBookingStatus("accepted")}
                  disabled={statusUpdating !== null}
                >
                  {statusUpdating === "accepted"
                    ? "Accepting..."
                    : "Accept & Chat"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 text-[11px]"
                  onClick={() => updateTalentBookingStatus("declined")}
                  disabled={statusUpdating !== null}
                >
                  {statusUpdating === "declined" ? "Declining..." : "Decline"}
                </Button>
              </div>
            </div>
          )}
          <Button
            onClick={() => openChat(booking.id, "booking")}
            variant="outline"
            disabled={!canTalentChat}
            className={cn(
              "w-full chat-button-native transition-all relative",
              canTalentChat
                ? "hover:bg-primary hover:text-primary-foreground hover:border-primary"
                : "opacity-50 cursor-not-allowed"
            )}
            size="default"
          >
            <MessageCircle className="mr-1.5 h-3 w-3" />
            Chat
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 p-0 text-[8px] font-bold flex items-center justify-center"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      ) : (
        // Web version stays the same as before
        <>
          <div className={cn("border-t space-y-2", "pt-3")}>
            <div className={cn("text-foreground", "text-sm")}>
              {mode === "talent" ? (
                <>
                  <strong>Booker Name:</strong>{" "}
                  <span className="text-muted-foreground">
                    {booking.booker_name}
                  </span>
                </>
              ) : (
                <>
                  <strong>Talent:</strong>{" "}
                  <span className="text-muted-foreground">
                    {booking.talent_profiles?.artist_name || "N/A"}
                  </span>
                </>
              )}
            </div>

            {booking.booker_email && mode !== "booker" && (
              <div className={cn("text-foreground", "text-sm")}>
                <strong>Booker Email:</strong>{" "}
                {mode === "talent" && shouldBlurContact && !isProUser ? (
                  <span className="text-muted-foreground blur-sm">
                    ••••••@••••.com
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {booking.booker_email}
                  </span>
                )}
              </div>
            )}

            {booking.booker_phone && mode !== "booker" && (
              <div className={cn("text-foreground", "text-sm")}>
                <strong>Booker Phone:</strong>{" "}
                {mode === "talent" && shouldBlurContact && !isProUser ? (
                  <span className="text-muted-foreground blur-sm">
                    +•• ••• ••• •••
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {booking.booker_phone}
                  </span>
                )}
              </div>
            )}

            {mode === "talent" &&
              shouldBlurContact &&
              !isProUser &&
              (booking.booker_email || booking.booker_phone) && (
                <div
                  className={cn(
                    "bg-primary/5 dark:bg-primary/10 rounded border border-primary/20",
                    "mt-1.5 p-1.5"
                  )}
                >
                  <p
                    className={cn(
                      "text-muted-foreground mb-1 leading-tight flex items-center gap-1",
                      "text-[9px]"
                    )}
                  >
                    <Crown
                      className={cn(
                        "text-primary flex-shrink-0",
                        "h-2.5 w-2.5"
                      )}
                    />
                    <span>
                      <strong>Pro:</strong> Unlock contact details & start
                      earning
                    </span>
                  </p>
                  <Button
                    size="sm"
                    onClick={() => navigate("/pricing")}
                    className={cn(
                      "w-full dashboard-card-button",
                      "h-6 text-[9px] px-2"
                    )}
                    variant="default"
                  >
                    Upgrade
                  </Button>
                </div>
              )}

            <div className={cn("text-foreground", "text-sm")}>
              <strong>Event Location:</strong>{" "}
              <span className="text-muted-foreground">
                {booking.event_location}
              </span>
            </div>

            {booking.event_address && (
              <div className={cn("text-foreground", "text-sm")}>
                <strong>Event Address:</strong>{" "}
                <span className="text-muted-foreground break-words">
                  {booking.event_address}
                </span>
              </div>
            )}

            {booking.description && (
              <div className={cn("text-foreground", "text-sm")}>
                <strong>Event Description:</strong>{" "}
                <span className="text-muted-foreground break-words">
                  {booking.description}
                </span>
              </div>
            )}
          </div>
          <div className={cn("flex flex-wrap gap-2 border-t mt-2", "pt-2")}>
            {mode === "talent" && isTalentPendingResponse && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className={cn(
                    "dashboard-card-button h-8 text-xs px-3"
                  )}
                  onClick={() => updateTalentBookingStatus("accepted")}
                  disabled={statusUpdating !== null}
                >
                  {statusUpdating === "accepted"
                    ? "Accepting..."
                    : "Accept & Chat"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="dashboard-card-button h-8 text-xs px-3"
                  onClick={() => updateTalentBookingStatus("declined")}
                  disabled={statusUpdating !== null}
                >
                  {statusUpdating === "declined" ? "Declining..." : "Decline"}
                </Button>
              </div>
            )}
            <Button
              onClick={() => openChat(booking.id, "booking")}
              variant="outline"
              size={isNativeApp ? "default" : "sm"}
              disabled={!canTalentChat}
              className={cn(
                "relative dashboard-card-button border-2 transition-all",
                canTalentChat
                  ? "hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  : "opacity-50 cursor-not-allowed",
                "h-8 text-xs px-3"
              )}
            >
              <MessageCircle className={cn("mr-1.5", "h-3.5 w-3.5")} />
              Chat
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className={cn(
                    "absolute -top-1 -right-1 flex items-center justify-center text-[9px] font-bold",
                    "h-4 w-4 p-0"
                  )}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Button>

            {mode === "admin" && (
              <AlertDialog
                open={showRemoveDialog}
                onOpenChange={setShowRemoveDialog}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size={isNativeApp ? "default" : "sm"}
                    className={cn("dashboard-card-button", "h-8 text-xs px-3")}
                  >
                    <Trash2 className={cn("mr-1.5", "h-3.5 w-3.5")} />
                    Remove
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Booking</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove this booking? This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRemove}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </>
      )}
    </div>
  );
};
