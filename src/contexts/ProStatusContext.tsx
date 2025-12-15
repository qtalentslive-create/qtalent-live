import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ProStatusContextType {
  isProUser: boolean;
  loading: boolean;
  talentProfileId: string | null;
  refreshProStatus: () => Promise<void>;
}

const ProStatusContext = createContext<ProStatusContextType | undefined>(
  undefined
);

export function ProStatusProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isProUser, setIsProUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [talentProfileId, setTalentProfileId] = useState<string | null>(null);

  const refreshProStatus = useCallback(async () => {
    if (!user) {
      setIsProUser(false);
      setTalentProfileId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("talent_profiles")
        .select("id, is_pro_subscriber")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching Pro status:", error);
        setIsProUser(false);
        setTalentProfileId(null);
        return;
      }

      if (data) {
        setIsProUser(data.is_pro_subscriber || false);
        setTalentProfileId(data.id);
      } else {
        setIsProUser(false);
        setTalentProfileId(null);
      }
    } catch (error) {
      console.error("Error in Pro status check:", error);
      setIsProUser(false);
      setTalentProfileId(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshProStatus();
  }, [refreshProStatus]);

  return (
    <ProStatusContext.Provider
      value={{
        isProUser,
        loading,
        talentProfileId,
        refreshProStatus,
      }}
    >
      {children}
    </ProStatusContext.Provider>
  );
}

export function useProStatus() {
  const context = useContext(ProStatusContext);
  if (context === undefined) {
    throw new Error("useProStatus must be used within a ProStatusProvider");
  }
  return context;
}
