// FILE: src/components/EventRequestCard.tsx

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  X,
  Mail,
  Phone,
  Trash2,
  Crown,
  EyeOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Capacitor } from "@capacitor/core";
import { useChat } from "@/contexts/ChatContext";

export interface EventRequest {
  id: string;
  booker_name: string;
  booker_email: string;
  booker_phone?: string | null;
  event_type: string;
  event_date: string;
  event_duration: number;
  event_location: string;
  description?: string | null;
  status: string;
  admin_reply?: string | null;
  hidden_by_talents?: string[] | null;
  accepted_by_talents?: string[] | null;
  declined_by_talents?: string[] | null;
}

interface EventRequestCardProps {
  request: EventRequest;
  isActionable?: boolean;
  mode: "talent" | "booker" | "admin";
  onRemove?: (requestId: string) => void;
  currentUserId?: string;
}

export const EventRequestCard = ({
  request,
  isActionable = false,
  mode,
  onRemove,
  currentUserId,
}: EventRequestCardProps) => {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [responseLoading, setResponseLoading] = useState<"accepted" | "declined" | null>(null);
  const navigate = useNavigate();
  const isNativeApp = Capacitor.isNativePlatform();
  const { openChat } = useChat();

  if (!request) return null;

  const handleRemove = async () => {
    try {
      if (mode === "talent") {
        // TALENT ACTION: Hide (archive) the request by adding their user_id to hidden_by_talents
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Authentication required");
          return;
        }

        // Fetch current hidden_by_talents array
        const { data: currentRequest, error: fetchError } = await supabase
          .from("event_requests")
          .select("hidden_by_talents")
          .eq("id", request.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        // Add current user to the array if not already present
        const currentHidden = currentRequest?.hidden_by_talents || [];
        if (!currentHidden.includes(user.id)) {
          const { error: updateError } = await supabase
            .from("event_requests")
            .update({
              hidden_by_talents: [...currentHidden, user.id],
            })
            .eq("id", request.id);

          if (updateError) throw updateError;
        }

        toast.success("Request hidden from your view");
        setShowRemoveDialog(false);
        if (onRemove) onRemove(request.id);
      } else if (mode === "booker" || mode === "admin") {
        // BOOKER/ADMIN ACTION: Permanent delete from database
        const { error } = await supabase
          .from("event_requests")
          .delete()
          .eq("id", request.id);

        if (error) throw error;

        toast.success("Request permanently deleted");
        setShowRemoveDialog(false);
        if (onRemove) onRemove(request.id);
      }
    } catch (error) {
      console.error("Error removing request:", error);
      toast.error(`Failed to ${mode === "talent" ? "hide" : "delete"} request`);
    }
  };

  const acceptedByTalents = useMemo(
    () => request.accepted_by_talents || [],
    [request.accepted_by_talents]
  );
  const declinedByTalents = useMemo(
    () => request.declined_by_talents || [],
    [request.declined_by_talents]
  );

  const initialResponse: "accepted" | "declined" | "pending" = useMemo(() => {
    if (!currentUserId) return "pending";
    if (acceptedByTalents.includes(currentUserId)) return "accepted";
    if (declinedByTalents.includes(currentUserId)) return "declined";
    return "pending";
  }, [acceptedByTalents, declinedByTalents, currentUserId]);

  const [responseStatus, setResponseStatus] = useState<"accepted" | "declined" | "pending">(initialResponse);

  useEffect(() => {
    setResponseStatus(initialResponse);
  }, [initialResponse, request.id]);

  const isBlurred = mode === "talent" && !isActionable;
  const hasResponded = responseStatus !== "pending";
  const canTalentChat =
    mode !== "talent" ? true : isActionable && responseStatus === "accepted";

  const handleTalentResponse = async (response: "accepted" | "declined") => {
    if (mode !== "talent") return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        toast.error("Please sign in to respond");
        return;
      }

      setResponseLoading(response);

      const acceptedSet = new Set(request.accepted_by_talents || []);
      const declinedSet = new Set(request.declined_by_talents || []);

      acceptedSet.delete(user.id);
      declinedSet.delete(user.id);

      if (response === "accepted") {
        acceptedSet.add(user.id);
      } else {
        declinedSet.add(user.id);
      }

      const updatePayload: Record<string, any> = {
        accepted_by_talents: Array.from(acceptedSet),
        declined_by_talents: Array.from(declinedSet),
      };

      if (response === "declined") {
        const hiddenSet = new Set(request.hidden_by_talents || []);
        hiddenSet.add(user.id);
        updatePayload.hidden_by_talents = Array.from(hiddenSet);
      }

      const { error } = await supabase
        .from("event_requests")
        .update(updatePayload)
        .eq("id", request.id);

      if (error) throw error;

      setResponseStatus(response);

      if (response === "declined") {
        toast.success("Request declined");
        if (onRemove) onRemove(request.id);
      } else {
        toast.success("Request accepted — chat unlocked");
        await openChat(request.id, "event_request");
      }
    } catch (responseError) {
      console.error("Error updating event request response:", responseError);
      toast.error("Failed to update response. Please try again.");
    } finally {
      setResponseLoading(null);
    }
  };

  const responseBadge =
    mode === "talent" && responseStatus === "accepted" ? (
      <Badge variant="outline" className="capitalize bg-primary/10 text-primary border-primary/30">
        Accepted
      </Badge>
    ) : null;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all bg-card text-card-foreground relative",
        isNativeApp
          ? "rounded-xl shadow-sm border border-border/50 bg-gradient-to-br from-card to-card/95"
          : "hover:shadow-md"
      )}
    >
      {/* Remove Button - More Subtle for Native */}
      {(mode === "booker" || mode === "talent") && (
        <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size={isNativeApp ? "default" : "sm"}
              className={cn(
                "absolute top-2.5 right-2.5 p-0 hover:bg-destructive hover:text-destructive-foreground z-10 rounded-full",
                isNativeApp
                  ? "h-7 w-7 bg-background/80 backdrop-blur-sm"
                  : "h-8 w-8"
              )}
            >
              {mode === "talent" ? (
                <EyeOff
                  className={cn(isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4")}
                />
              ) : (
                <Trash2
                  className={cn(isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4")}
                />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {mode === "talent" ? "Hide Request" : "Delete Request"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {mode === "talent"
                  ? "This will hide this event request from your dashboard. The request will remain visible to the booker and admin."
                  : "Are you sure you want to permanently delete this event request? This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemove}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {mode === "talent" ? "Hide" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isNativeApp ? (
        // Native App Compact Design
        <div className="p-3 w-full">
          {/* Header - Compact with Icon */}
          <div className="flex items-start gap-2.5 mb-2.5">
            <div className="rounded-lg w-9 h-9 bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm capitalize text-foreground mb-1 leading-tight">
                {request.event_type}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{format(new Date(request.event_date), "MMM d")}</span>
                <span>•</span>
                <span>{request.event_duration}h</span>
                <span>•</span>
                <MapPin className="h-3 w-3" />
                <span className="truncate">{request.event_location}</span>
              </div>
            </div>
          </div>

          {/* Booker Info - Compact Card */}
          <div className="bg-muted/40 rounded-lg p-2.5 mb-2 space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
              Booker Details
            </p>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Name</span>
                <span
                  className={cn(
                    "text-xs font-semibold text-foreground truncate flex-1 text-right ml-2",
                    isBlurred && "blur-sm"
                  )}
                >
                  {request.booker_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <span
                  className={cn(
                    "text-[11px] text-muted-foreground truncate flex-1 text-right ml-2",
                    isBlurred && "blur-sm"
                  )}
                >
                  {request.booker_email}
                </span>
              </div>
              {request.booker_phone && (
                <div className="flex items-center justify-between">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span
                    className={cn(
                      "text-[11px] text-muted-foreground truncate flex-1 text-right ml-2",
                      isBlurred && "blur-sm"
                    )}
                  >
                    {request.booker_phone}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Description - Compact */}
          {request.description && (
            <div className="mb-2">
              <p className="text-[11px] font-medium text-muted-foreground mb-1">
                Description
              </p>
              <p className="text-xs text-foreground leading-relaxed line-clamp-2">
                {request.description}
              </p>
            </div>
          )}

          {/* Pro Upgrade - More Prominent */}
          {isBlurred && (
            <div className="bg-primary/10 rounded-lg p-2.5 mb-2 border border-primary/20">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Crown className="h-3.5 w-3.5 text-primary" />
                <p className="text-[11px] font-bold text-primary">
                  Pro Feature
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">
                Unlock contact details & unlimited messaging
              </p>
              <Button
                size="sm"
                onClick={() => navigate("/pricing")}
                className="w-full h-7 text-[10px] font-semibold"
                variant="default"
              >
                Upgrade Now
              </Button>
            </div>
          )}

          {mode === "talent" && (
            <div className="mb-2">
              <p className="text-[11px] font-medium text-muted-foreground mb-1">
                Respond to this request
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className={cn(
                    "flex-1 h-7 text-[10px]",
                    responseStatus === "accepted" && "bg-primary/80 text-primary-foreground"
                  )}
                  onClick={() => handleTalentResponse("accepted")}
                  disabled={
                    responseStatus === "accepted" ||
                    responseLoading !== null
                  }
                >
                  {responseStatus === "accepted"
                    ? "Accepted"
                    : responseLoading === "accepted"
                    ? "Accepting..."
                    : "Accept & Chat"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-[10px]"
                  onClick={() => handleTalentResponse("declined")}
                  disabled={
                    responseStatus === "declined" ||
                    responseLoading !== null
                  }
                >
                  {responseStatus === "declined"
                    ? "Declined"
                    : responseLoading === "declined"
                    ? "Declining..."
                    : "Decline"}
                </Button>
              </div>
              {responseStatus !== "accepted" && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Accepting unlocks chat. Declining hides this request.
                </p>
              )}
            </div>
          )}

          {/* Action Button - Compact Design for Native */}
          <Button
            disabled={!canTalentChat}
            size="default"
            variant="outline"
            onClick={async () => {
              if (mode === "talent" && canTalentChat) {
                await openChat(request.id, "event_request");
              } else if (mode === "booker") {
                await openChat(request.id, "event_request");
              }
            }}
            className={cn(
              "w-full chat-button-native transition-all",
              mode === "talent" && !canTalentChat 
                ? "opacity-50 cursor-not-allowed" 
                : "hover:bg-primary hover:text-primary-foreground hover:border-primary"
            )}
          >
            <MessageCircle className="mr-1.5 h-3 w-3" />
            Chat
          </Button>
        </div>
      ) : (
        // Web version - keep existing design
        <>
          <CardHeader className={cn("p-3 pb-2")}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-8">
                <CardTitle
                  className={cn(
                    "font-semibold",
                    isNativeApp ? "mb-1.5 text-sm" : "mb-2 text-base"
                  )}
                >
                  <span className="capitalize">
                    Event Type: {request.event_type}
                  </span>
                </CardTitle>
                <p
                  className={cn(
                    "text-muted-foreground flex items-center",
                    isNativeApp ? "text-xs" : "text-sm"
                  )}
                >
                  <Calendar
                    className={cn(
                      "mr-1.5 flex-shrink-0",
                      isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4"
                    )}
                  />
                  <span className="truncate">
                    {request.event_date
                      ? format(
                          new Date(request.event_date),
                          isNativeApp ? "PP" : "PPP"
                        )
                      : "No date specified"}
                  </span>
                </p>
              </div>
              {responseBadge && (
                <div className="flex-shrink-0">{responseBadge}</div>
              )}
            </div>
          </CardHeader>

          <CardContent
            className={cn("space-y-3", isNativeApp ? "p-3 pt-2" : "space-y-4")}
          >
            {/* Booker Information */}
            <div
              className={cn(
                "border rounded-lg bg-muted/30",
                isNativeApp ? "p-2" : "p-3"
              )}
            >
              <h4
                className={cn(
                  "font-medium mb-1.5 text-foreground",
                  isNativeApp ? "text-xs" : "text-sm"
                )}
              >
                Booker Information
              </h4>
              <div
                className={cn(
                  "space-y-1.5",
                  isNativeApp ? "text-xs" : "text-sm space-y-2"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-foreground flex-shrink-0">
                    Booker Name:
                  </span>
                  <span
                    className={cn(
                      "text-muted-foreground truncate",
                      isBlurred && "blur-sm select-none"
                    )}
                  >
                    {request.booker_name}
                  </span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Mail
                    className={cn(
                      "text-muted-foreground flex-shrink-0",
                      isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4"
                    )}
                  />
                  <span className="font-medium text-foreground flex-shrink-0">
                    Booker Email:
                  </span>
                  <span
                    className={cn(
                      "text-muted-foreground truncate",
                      isBlurred && "blur-sm select-none"
                    )}
                  >
                    {request.booker_email}
                  </span>
                </div>
                {request.booker_phone && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Phone
                      className={cn(
                        "text-muted-foreground flex-shrink-0",
                        isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4"
                      )}
                    />
                    <span className="font-medium text-foreground flex-shrink-0">
                      Booker Phone:
                    </span>
                    <span
                      className={cn(
                        "text-muted-foreground truncate",
                        isBlurred && "blur-sm select-none"
                      )}
                    >
                      {request.booker_phone}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Event Details */}
            <div
              className={cn(
                "grid gap-3",
                isNativeApp
                  ? "grid-cols-1 text-xs"
                  : "grid-cols-1 md:grid-cols-2 gap-4 text-sm"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Clock
                  className={cn(
                    "text-muted-foreground flex-shrink-0",
                    isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4"
                  )}
                />
                <span className="font-medium text-foreground flex-shrink-0">
                  Duration:
                </span>
                <span className="text-muted-foreground truncate">
                  {request.event_duration} hours
                </span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <MapPin
                  className={cn(
                    "text-muted-foreground flex-shrink-0",
                    isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4"
                  )}
                />
                <span className="font-medium text-foreground flex-shrink-0">
                  Event Location:
                </span>
                <span className="text-muted-foreground truncate">
                  {request.event_location}
                </span>
              </div>
            </div>

            {request.description && (
              <div className={cn("border-t", isNativeApp ? "pt-2" : "pt-3")}>
                <h4
                  className={cn(
                    "font-medium mb-1.5 text-foreground",
                    isNativeApp ? "text-xs" : "text-sm mb-2"
                  )}
                >
                  Event Description:
                </h4>
                <p
                  className={cn(
                    "text-muted-foreground bg-muted/50 rounded break-words",
                    isNativeApp ? "text-xs p-2" : "text-sm p-3"
                  )}
                >
                  {request.description}
                </p>
              </div>
            )}

            {/* Pro Feature Upgrade Section for blurred content */}
            {isBlurred && (
              <div
                className={cn(
                  "bg-primary/5 dark:bg-primary/10 rounded border border-primary/20",
                  isNativeApp ? "mb-1.5 p-1.5" : "mb-2 p-2"
                )}
              >
                <p
                  className={cn(
                    "text-muted-foreground mb-1 leading-tight flex items-center gap-1",
                    isNativeApp ? "text-[9px]" : "text-[10px]"
                  )}
                >
                  <Crown
                    className={cn(
                      "text-primary flex-shrink-0",
                      isNativeApp ? "h-2.5 w-2.5" : "h-3 w-3"
                    )}
                  />
                  <span>
                    <strong>Pro:</strong> Unlock contact details & unlimited
                    messaging
                  </span>
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate("/pricing")}
                  className={cn(
                    "w-full dashboard-card-button",
                    isNativeApp ? "h-6 text-[9px] px-2" : "h-6 text-[10px]"
                  )}
                  variant="default"
                >
                  Upgrade
                </Button>
              </div>
            )}

            {mode === "talent" && (
              <div
                className={cn(
                  "border-t",
                  isNativeApp ? "pt-2" : "pt-3"
                )}
              >
                <p
                  className={cn(
                    "text-muted-foreground mb-2",
                    isNativeApp ? "text-[10px]" : "text-xs"
                  )}
                >
                  {responseStatus === "accepted"
                    ? "You accepted this event request. Chat is unlocked."
                    : "Please accept or decline this request so the booker gets an answer."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size={isNativeApp ? "default" : "sm"}
                    onClick={() => handleTalentResponse("accepted")}
                    disabled={responseStatus === "accepted" || responseLoading === "declined" || responseLoading === "accepted"}
                    className={cn(
                      "dashboard-card-button",
                      responseStatus === "accepted" && "bg-primary/80 text-primary-foreground"
                    )}
                  >
                    {responseStatus === "accepted"
                      ? "Accepted"
                      : responseLoading === "accepted"
                      ? "Accepting..."
                      : "Accept & Chat"}
                  </Button>
                  <Button
                    size={isNativeApp ? "default" : "sm"}
                    variant="outline"
                    onClick={() => handleTalentResponse("declined")}
                    disabled={responseStatus === "declined" || responseLoading === "accepted" || responseLoading === "declined"}
                    className="dashboard-card-button"
                  >
                    {responseStatus === "declined"
                      ? "Declined"
                      : responseLoading === "declined"
                      ? "Declining..."
                      : "Decline"}
                  </Button>
                </div>
              </div>
            )}

            <div
              className={cn(
                "border-t flex justify-between items-center gap-2",
                isNativeApp ? "pt-2" : "pt-3"
              )}
            >
              <div className="flex gap-2">
                {mode === "admin" && onRemove && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size={isNativeApp ? "default" : "sm"}
                        className={cn(
                          "text-destructive hover:bg-destructive hover:text-destructive-foreground dashboard-card-button",
                          isNativeApp ? "h-8 text-xs px-3" : ""
                        )}
                      >
                        <X
                          className={cn(
                            "mr-1.5",
                            isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4"
                          )}
                        />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Request</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to permanently delete this event
                          request? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleRemove}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {/* Event Request Chat - Enabled for pro talents and bookers */}
              <div className="flex-shrink-0">
                <Button
                  disabled={!canTalentChat}
                  size={isNativeApp ? "default" : "sm"}
                  variant="outline"
                  onClick={async () => {
                    if (mode === "talent" && canTalentChat) {
                      // Pro talent opening chat with booker
                      await openChat(request.id, "event_request");
                    } else if (mode === "booker") {
                      // Booker opening chat for their event request
                      await openChat(request.id, "event_request");
                    }
                  }}
                  className={cn(
                    "relative dashboard-card-button border-2 transition-all",
                    mode === "talent" && !canTalentChat
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary",
                    isNativeApp ? "h-8 text-xs px-3" : "h-8 text-xs px-3"
                  )}
                >
                  <MessageCircle
                    className={cn(
                      "mr-1.5",
                      isNativeApp ? "h-3.5 w-3.5" : "h-3.5 w-3.5"
                    )}
                  />
                  Chat
                </Button>
              </div>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
};
