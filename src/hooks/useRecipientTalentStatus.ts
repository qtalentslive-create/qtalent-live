import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RecipientTalentStatus {
  isRecipientNonProTalent: boolean;
  isLoading: boolean;
}

export const useRecipientTalentStatus = (
  channelInfo: { id: string; type: "booking" | "event_request" } | null,
  currentUserId?: string,
): RecipientTalentStatus => {
  const [isRecipientNonProTalent, setIsRecipientNonProTalent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkRecipientTalentStatus = async () => {
      if (!channelInfo || !currentUserId) {
        setIsRecipientNonProTalent(false);
        return;
      }

      setIsLoading(true);
      try {
        if (channelInfo.type === "booking") {
          const { data: booking, error: bookingError } = await supabase
            .from("bookings")
            .select("user_id, talent_id")
            .eq("id", channelInfo.id)
            .single();

          if (bookingError) {
            console.error("Error fetching booking:", bookingError);
          }

          if (booking && booking.talent_id) {
            const isCurrentUserBooker = booking.user_id === currentUserId;

            if (isCurrentUserBooker) {
              const { data: talent, error: talentError } = await supabase
                .from("talent_profiles")
                .select("is_pro_subscriber, subscription_status, manual_grant_expires_at")
                .eq("id", booking.talent_id)
                .single();

              if (talentError) {
                console.error("Error fetching talent profile:", talentError);
              }

              if (talent) {
                const hasActiveSub = talent.subscription_status === "active";
                const hasAdminGrant =
                  talent.manual_grant_expires_at && new Date(talent.manual_grant_expires_at) > new Date();
                const isProViaFlag = talent.is_pro_subscriber;

                const isTalentPro = hasActiveSub || hasAdminGrant || isProViaFlag;
                setIsRecipientNonProTalent(!isTalentPro);
              } else {
                // Profile not found, default to allowing chat
                setIsRecipientNonProTalent(false);
              }
            } else {
              setIsRecipientNonProTalent(false);
            }
          } else {
            setIsRecipientNonProTalent(false);
          }
        } else if (channelInfo.type === "event_request") {
          // For event_request chats, we don't need to filter messages
          // - Talents messaging bookers: Bookers are not talents, so no filtering needed
          // - Bookers messaging talents: Only pro talents can send messages (enforced by RLS)
          setIsRecipientNonProTalent(false);
        } else {
          setIsRecipientNonProTalent(false);
        }
      } catch (error) {
        console.error("Error checking recipient talent status:", error);
        // Default to FALSE (assume Pro/allow chat) on errors to prevent false positives
        setIsRecipientNonProTalent(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkRecipientTalentStatus();
  }, [channelInfo, currentUserId]);

  return { isRecipientNonProTalent, isLoading };
};
