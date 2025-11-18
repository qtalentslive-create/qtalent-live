import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface ChannelInfo {
  type: "booking" | "event_request";
  id: string;
}

export interface Message {
  id: string;
  created_at: string;
  sender_id: string;
  content: string;
  booking_id?: string | null;
  event_request_id?: string | null;
}

interface ChatContextType {
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
  loading: boolean;
  loadingMessages: boolean;
  error: string | null;
  isOpen: boolean;
  openChat: (id: string, type: "booking" | "event_request") => Promise<void>;
  closeChat: () => void;
  channelInfo: ChannelInfo | null;
  setUserInteracting: (isInteracting: boolean) => void;
  viewedChats: Set<string>;
  markAllAsRead: (ids: string[], type: "booking" | "event_request") => void;
  recipientUserId: string | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageChannel, setMessageChannel] = useState<RealtimeChannel | null>(
    null
  );
  const [isOpen, setIsOpen] = useState(false);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [recipientUserId, setRecipientUserId] = useState<string | null>(null);
  const [userInteracting, setUserInteracting] = useState(false);
  const [viewedChats, setViewedChats] = useState<Set<string>>(new Set());

  // Load messages when channel changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!channelInfo) {
        setMessages([]);
        return;
      }

      setLoadingMessages(true);
      try {
        let query = supabase
          .from("chat_messages")
          .select("*");

        if (channelInfo.type === "booking") {
          query = query.eq("booking_id", channelInfo.id);
        } else if (channelInfo.type === "event_request") {
          query = query.eq("event_request_id", channelInfo.id);
        }

        const { data, error } = await query.order("created_at", { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (e) {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError("An unknown error occurred while fetching messages.");
        }
      } finally {
        setLoadingMessages(false);
      }
    };
    fetchMessages();
  }, [channelInfo]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (messageChannel) {
      messageChannel.unsubscribe();
    }
    if (user && channelInfo) {
      const channel = supabase
        .channel(`chat_${channelInfo.type}_${channelInfo.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_messages" },
          (payload) => {
            const newMessage = payload.new as Message;
            // Check if message belongs to current channel
            if (
              (channelInfo.type === "booking" && newMessage.booking_id === channelInfo.id) ||
              (channelInfo.type === "event_request" && newMessage.event_request_id === channelInfo.id)
            ) {
              setMessages((prev) => [...prev, newMessage]);
            }
          }
        )
        .subscribe();
      setMessageChannel(channel);
    }
    return () => {
      messageChannel?.unsubscribe();
    };
  }, [user, channelInfo]);

  const openChat = useCallback(
    async (id: string, type: "booking" | "event_request" = "booking") => {
      if (!user) return;
      setChannelInfo({ type, id });
      setIsOpen(true);
      setViewedChats((prev) => new Set(prev).add(`${type}_${id}`));

      // Find the recipient
      setLoading(true);
      setError(null);
      setRecipientUserId(null);
      try {
        if (type === "booking") {
          // Handle booking chat (existing logic)
          const { data, error } = await supabase
            .from("bookings")
            .select("user_id, talent_id")
            .eq("id", id)
            .single();
          if (error) throw error;

          const bookerId = data.user_id;
          const talentId = data.talent_id;

          if (talentId) {
            const { data: profile, error: pError } = await supabase
              .from("talent_profiles")
              .select("user_id")
              .eq("id", talentId)
              .single();
            if (pError) throw pError;

            // The recipient is the *other* person
            const otherUserId =
              bookerId === user.id ? profile.user_id : bookerId;
            setRecipientUserId(otherUserId);
          }
        } else if (type === "event_request") {
          // Handle event_request chat (new logic)
          const { data: eventRequest, error } = await supabase
            .from("event_requests")
            .select("user_id")
            .eq("id", id)
            .single();
          if (error) throw error;

          const bookerId = eventRequest.user_id;

          // Check if current user is a talent
          const { data: talentProfile } = await supabase
            .from("talent_profiles")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (talentProfile) {
            // Current user is a talent, recipient is the booker
            setRecipientUserId(bookerId);
          } else if (bookerId === user.id) {
            // Current user is the booker
            // For event requests, bookers can see messages from any talent
            // We'll set recipient to null and handle it differently in notifications
            setRecipientUserId(null);
          }
        }
      } catch (e) {
        if (e instanceof Error) {
          console.error("Error fetching chat recipient:", e.message);
          setError("Error loading chat participant.");
        }
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const closeChat = () => {
    setIsOpen(false);
    setChannelInfo(null);
    setRecipientUserId(null);
    setMessages([]);
  };

  const markAllAsRead = useCallback(
    (ids: string[], type: "booking" | "event_request" = "booking") => {
      setViewedChats((prev) => {
        const newSet = new Set(prev);
        ids.forEach((id) => newSet.add(`${type}_${id}`));
        return newSet;
      });
    },
    []
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !channelInfo) {
        return;
      }

      // Prepare message data based on channel type
      const messageData: {
        sender_id: string;
        content: string;
        booking_id?: string | null;
        event_request_id?: string | null;
      } = {
        sender_id: user.id,
        content,
      };

      if (channelInfo.type === "booking") {
        messageData.booking_id = channelInfo.id;
      } else if (channelInfo.type === "event_request") {
        messageData.event_request_id = channelInfo.id;
      }

      const { data: newMsg, error } = await supabase
        .from("chat_messages")
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error("Error sending message:", error);
        toast({
          title: "Error",
          description: "Could not send message.",
          variant: "destructive",
        });
        return;
      }

      // Send push notification if we have a recipient
      if (recipientUserId) {
        try {
          const { error: functionError } = await supabase.functions.invoke(
            "send-push-notification",
            {
              body: {
                userId: recipientUserId,
                title: `New message from ${user.user_metadata?.name || "a user"}`,
                body: content,
                url: channelInfo.type === "booking" 
                  ? `/booker-dashboard?chat=${channelInfo.id}`
                  : `/booker-dashboard?eventRequest=${channelInfo.id}`,
                bookingId: channelInfo.type === "booking" ? newMsg.id : undefined,
                eventRequestId: channelInfo.type === "event_request" ? channelInfo.id : undefined,
              },
            }
          );

          if (functionError) {
            console.error("Failed to send push notification:", functionError);
          }
        } catch (e) {
          if (e instanceof Error) {
            console.error(
              "Error invoking push notification function:",
              e.message
            );
          }
        }
      }
    },
    [user, channelInfo, recipientUserId, toast]
  );

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        loading,
        loadingMessages,
        error,
        isOpen,
        openChat,
        closeChat,
        channelInfo,
        setUserInteracting,
        viewedChats,
        markAllAsRead,
        recipientUserId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
