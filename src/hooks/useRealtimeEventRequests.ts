import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useRealtimeEventRequests = (refreshEventRequests: () => void) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Subscribe to ALL event request changes (RLS will filter appropriately)
    const eventRequestChannel = supabase
      .channel(`event-requests-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_requests',
        },
        (payload) => {
          refreshEventRequests();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(eventRequestChannel);
      setIsConnected(false);
    };
  }, [user, refreshEventRequests]);

  return { isConnected };
};
