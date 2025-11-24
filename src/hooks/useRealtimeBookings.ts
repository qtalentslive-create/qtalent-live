import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useRealtimeBookings = (refreshBookings: () => void) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Subscribe to booking changes for this user
    const bookingChannel = supabase
      .channel(`bookings-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        async (payload) => {
          const booking = payload.new || payload.old;
          if (!booking) return;

          // Check if this booking involves the current user
          const isUserBooking = (booking as any).user_id === user.id;
          
          // Check if this is a talent booking
          const { data: talentProfile } = await supabase
            .from('talent_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();
            
          const isTalentBooking = talentProfile && (booking as any).talent_id === talentProfile.id;

          if (isUserBooking || isTalentBooking) {
            refreshBookings();
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(bookingChannel);
      setIsConnected(false);
    };
  }, [user, refreshBookings]);

  return { isConnected };
};