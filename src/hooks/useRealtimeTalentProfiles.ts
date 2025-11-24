import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRealtimeTalentProfiles = (refreshTalents: () => void) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Subscribe to talent profile changes
    const talentProfileChannel = supabase
      .channel('talent-profiles-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'talent_profiles',
        },
        (payload) => {
          refreshTalents();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(talentProfileChannel);
      setIsConnected(false);
    };
  }, [refreshTalents]);

  return { isConnected };
};
