// FILE: src/components/UniversalChat.tsx

import { useState, useEffect, useRef } from "react";
import { useChat, Message } from "@/contexts/ChatContext";
import { useAuth } from "@/hooks/useAuth";
import { useTalentBookingLimit } from "@/hooks/useTalentBookingLimit";
import { useAdvancedChatFilter } from "@/hooks/useAdvancedChatFilter";
import { useRecipientTalentStatus } from "@/hooks/useRecipientTalentStatus";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, X, Crown, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

export const UniversalChat = () => {
  const {
    isOpen,
    closeChat,
    messages,
    sendMessage,
    loadingMessages,
    channelInfo,
    setUserInteracting,
  } = useChat();
  const { user } = useAuth();
  const { isProUser, isTalent } = useTalentBookingLimit();
  const { isRecipientNonProTalent } = useRecipientTalentStatus(
    channelInfo,
    user?.id
  );

  const { filterMessage, updateConversationBuffer } = useAdvancedChatFilter(
    channelInfo,
    user?.id,
    isProUser || (!isTalent && !isRecipientNonProTalent),
    isTalent
  );
  const { toast } = useToast();
  const navigate = useNavigate();
  const isNativeApp = Capacitor.isNativePlatform();
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showFilteredMessage, setShowFilteredMessage] = useState<string | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [senderNames, setSenderNames] = useState<{ [key: string]: string }>({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loadingMessages]);

  // Update conversation buffer when messages change
  useEffect(() => {
    if (messages.length > 0) {
      updateConversationBuffer(messages);
    }
  }, [messages, updateConversationBuffer]);

  // Communicate interaction state to context
  useEffect(() => {
    setUserInteracting(isTyping || isHovering || isFocused);
  }, [isTyping, isHovering, isFocused, setUserInteracting]);

  // Fetch sender names for messages
  useEffect(() => {
    const fetchSenderNames = async () => {
      if (!messages.length || !channelInfo) return;

      // Get unique sender IDs that we don't have names for yet
      const unknownSenders = messages
        .filter(
          (msg) => msg.sender_id !== user?.id && !senderNames[msg.sender_id]
        )
        .map((msg) => msg.sender_id);

      if (unknownSenders.length === 0) return;

      const names: { [key: string]: string } = {};

      if (channelInfo.type === "booking") {
        // For booking chats, get booker name and talent name
        const { data: booking } = await supabase
          .from("bookings")
          .select(
            "user_id, booker_name, talent_id, talent_profiles(user_id, artist_name)"
          )
          .eq("id", channelInfo.id)
          .single();

        if (booking) {
          // Booker name
          names[booking.user_id] = booking.booker_name || "Booker";

          // Talent name
          if (booking.talent_profiles) {
            const talent = booking.talent_profiles as any;
            names[talent.user_id] = talent.artist_name || "Talent";
          }
        }
      } else if (channelInfo.type === "event_request") {
        // For event request chats, get booker name and talent names
        const { data: eventRequest } = await supabase
          .from("event_requests")
          .select("user_id, booker_name")
          .eq("id", channelInfo.id)
          .single();

        if (eventRequest) {
          // Booker name
          names[eventRequest.user_id] = eventRequest.booker_name || "Booker";
        }

        // Get talent names for all talent senders
        const talentUserIds = unknownSenders.filter(
          (id) => id !== eventRequest?.user_id
        );
        if (talentUserIds.length > 0) {
          const { data: talents } = await supabase
            .from("talent_profiles")
            .select("user_id, artist_name")
            .in("user_id", talentUserIds);

          if (talents) {
            talents.forEach((talent) => {
              names[talent.user_id] = talent.artist_name || "Talent";
            });
          }
        }
      }

      if (Object.keys(names).length > 0) {
        setSenderNames((prev) => ({ ...prev, ...names }));
      }
    };

    fetchSenderNames();
  }, [messages, channelInfo, user?.id, senderNames]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && user?.id) {
      // Apply advanced filtering for non-pro talents (sender is talent)
      if (isTalent && !isProUser) {
        const filterResult = filterMessage(newMessage);
        if (filterResult.isBlocked) {
          setShowFilteredMessage(filterResult.reason || "Message blocked");
          setNewMessage("");
          return;
        }
      }

      // Apply advanced filtering when bookers message non-pro talents (recipient is non-pro talent)
      if (!isTalent && isRecipientNonProTalent) {
        const filterResult = filterMessage(newMessage);
        if (filterResult.isBlocked) {
          toast({
            title: "Message Blocked",
            description: filterResult.reason || "This message is not allowed.",
            variant: "destructive",
          });
          setShowFilteredMessage(
            filterResult.reason || "This message is not allowed."
          );
          setNewMessage("");
          return;
        }
      }

      sendMessage(newMessage);
      setNewMessage("");
      setShowFilteredMessage(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeChat}>
      <DialogContent
        hideCloseButton={true}
        className={`${
          isNativeApp
            ? "max-w-full h-[90vh] left-0 right-0 bottom-0 top-auto translate-y-0 rounded-t-2xl"
            : "max-w-2xl h-[80vh]"
        } flex flex-col p-0 gap-0`}
      >
        <DialogHeader
          className={`${isNativeApp ? "px-3 py-2.5" : "px-4 py-3"} border-b`}
        >
          <div className="flex items-center justify-between">
            <DialogTitle
              className={isNativeApp ? "text-base font-semibold" : ""}
            >
              {channelInfo?.type === "booking"
                ? "Booking Chat"
                : "Event Request Chat"}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeChat}
              className={isNativeApp ? "h-8 w-8" : "h-8 w-8"}
            >
              <X className={isNativeApp ? "h-4 w-4" : "h-4 w-4"} />
            </Button>
          </div>
        </DialogHeader>

        <div
          className={`flex-1 overflow-y-auto ${
            isNativeApp ? "p-3" : "p-4"
          } space-y-3 min-h-0`}
        >
          {loadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p
                className={`${
                  isNativeApp ? "text-sm" : ""
                } text-muted-foreground text-center`}
              >
                Start the conversation!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const senderName =
                senderNames[msg.sender_id] ||
                msg.sender_id.slice(0, 2).toUpperCase();
              const displayInitials = senderNames[msg.sender_id]
                ? senderNames[msg.sender_id]
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : msg.sender_id.slice(0, 2).toUpperCase();

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex items-end gap-2",
                    msg.sender_id === user?.id ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.sender_id !== user?.id && (
                    <div className="flex flex-col items-start gap-1">
                      <Avatar
                        className={cn(
                          isNativeApp
                            ? "h-7 w-7 flex-shrink-0"
                            : "h-8 w-8 flex-shrink-0"
                        )}
                      >
                        <AvatarFallback
                          className={isNativeApp ? "text-xs" : ""}
                        >
                          {displayInitials}
                        </AvatarFallback>
                      </Avatar>
                      {senderNames[msg.sender_id] && (
                        <p
                          className={cn(
                            "text-xs text-muted-foreground",
                            isNativeApp ? "text-[10px]" : ""
                          )}
                        >
                          {senderNames[msg.sender_id]}
                        </p>
                      )}
                    </div>
                  )}
                  <div
                    className={cn(
                      `max-w-[75%] ${
                        isNativeApp
                          ? "p-2.5 rounded-lg text-sm"
                          : "p-3 rounded-2xl text-sm"
                      } break-words`,
                      msg.sender_id === user?.id
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted rounded-bl-none"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={cn(
                        `${isNativeApp ? "text-[10px]" : "text-xs"} mt-1`,
                        msg.sender_id === user?.id
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground/70"
                      )}
                    >
                      {format(new Date(msg.created_at), "p")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div
          className={`border-t ${
            isNativeApp ? "p-3" : "p-4"
          } flex-shrink-0 space-y-2`}
        >
          {/* Pro upgrade prompt - Compact and native-looking */}
          {isTalent && !isProUser && (
            <div
              className={`flex items-center gap-2 ${
                isNativeApp
                  ? "p-2 bg-primary/5 rounded-md border border-primary/15"
                  : "p-2 bg-primary/10 rounded-lg border border-primary/20"
              }`}
            >
              <Crown
                className={`${
                  isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4"
                } text-primary flex-shrink-0`}
              />
              <p
                className={`${
                  isNativeApp ? "text-xs flex-1" : "text-sm flex-1"
                }`}
              >
                <strong className={isNativeApp ? "text-xs" : ""}>Pro:</strong>{" "}
                Share contact info
              </p>
              <Button
                size={isNativeApp ? "sm" : "sm"}
                onClick={() => {
                  navigate("/pricing");
                  closeChat();
                }}
                className={isNativeApp ? "h-7 px-2.5 text-xs font-medium" : ""}
              >
                Upgrade
              </Button>
            </div>
          )}

          {/* Alert for bookers - Compact */}
          {!isTalent && isRecipientNonProTalent && (
            <div
              className={`flex items-center gap-2 ${
                isNativeApp
                  ? "p-2 bg-yellow-500/5 rounded-md border border-yellow-500/15"
                  : "p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20"
              }`}
            >
              <AlertTriangle
                className={`${
                  isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4"
                } text-yellow-600 flex-shrink-0`}
              />
              <p
                className={`${
                  isNativeApp ? "text-xs" : "text-sm"
                } text-yellow-600`}
              >
                {isNativeApp
                  ? "Talent can't receive contact details"
                  : "This talent can't receive contact details (Free plan)"}
              </p>
            </div>
          )}

          {/* Filtered message - Compact */}
          {showFilteredMessage && (
            <div
              className={`flex items-center gap-2 ${
                isNativeApp
                  ? "p-2 bg-destructive/5 rounded-md border border-destructive/15"
                  : "p-2 bg-destructive/10 rounded-lg border border-destructive/20"
              }`}
            >
              <AlertTriangle
                className={`${
                  isNativeApp ? "h-3.5 w-3.5" : "h-4 w-4"
                } text-destructive flex-shrink-0`}
              />
              <p
                className={`${
                  isNativeApp ? "text-xs" : "text-sm"
                } text-destructive`}
              >
                {showFilteredMessage}
              </p>
            </div>
          )}

          {/* Message Input */}
          <form
            onSubmit={handleSendMessage}
            className={`flex items-end gap-2 ${isNativeApp ? "gap-2" : ""}`}
          >
            <Textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                setIsTyping(e.target.value.length > 0);
                if (typingTimeoutRef.current)
                  clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                  if (!isFocused) setIsTyping(false);
                }, 5000);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                setIsFocused(false);
                setTimeout(() => {
                  if (!isFocused) setIsTyping(false);
                }, 1000);
              }}
              placeholder="Type your message..."
              rows={1}
              className={`flex-1 ${
                isNativeApp
                  ? "min-h-[48px] text-sm resize-none"
                  : "min-h-[60px] resize-none"
              }`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <Button
              type="submit"
              disabled={!newMessage.trim()}
              size="icon"
              className={
                isNativeApp
                  ? "h-10 w-10 flex-shrink-0"
                  : "h-10 w-10 flex-shrink-0"
              }
            >
              <Send className={isNativeApp ? "h-4 w-4" : "h-4 w-4"} />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
