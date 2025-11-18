-- REVERT: Remove event request chat functionality
-- This migration reverts the changes made in:
-- - 20250115000000_fix_event_request_notifications.sql
-- - 20250116000000_fix_event_request_chat.sql

-- 1. Revert RLS policies to booking-only (remove event_request support)
DROP POLICY IF EXISTS "Chat participants can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat participants can read messages" ON public.chat_messages;

-- Restore original booking-only policies (as they were before event_request changes)
CREATE POLICY "Chat participants can read messages" 
ON public.chat_messages FOR SELECT 
USING (
  -- Admin can see all messages
  is_admin(auth.uid()) OR
  -- Booking chat participants only
  (booking_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE id = chat_messages.booking_id 
    AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.talent_profiles 
      WHERE id = bookings.talent_id AND user_id = auth.uid()
    ))
  ))
);

CREATE POLICY "Chat participants can send messages" 
ON public.chat_messages FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND (
    -- Admin can send to any chat
    is_admin(auth.uid()) OR
    -- Booking chat participants only
    (booking_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE id = chat_messages.booking_id 
      AND (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.talent_profiles 
        WHERE id = bookings.talent_id AND user_id = auth.uid()
      ))
    ))
  )
);

-- 2. Revert create_notification_for_new_message function to booking-only
CREATE OR REPLACE FUNCTION public.create_notification_for_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recipient_user_id UUID;
  notification_message TEXT;
  link_path TEXT;
  sender_name TEXT;
  booker_id UUID;
  talent_user_id UUID;
  talent_profile_id UUID;
  event_type TEXT;
BEGIN
  -- Only handle booking messages (remove event_request handling)
  IF NEW.booking_id IS NOT NULL THEN
    SELECT 
      bookings.user_id, 
      bookings.talent_id, 
      bookings.event_type, 
      talent_profiles.artist_name, 
      bookings.booker_name,
      talent_profiles.user_id
    INTO booker_id, talent_profile_id, event_type, sender_name, sender_name, talent_user_id
    FROM public.bookings
    LEFT JOIN public.talent_profiles ON public.bookings.talent_id = public.talent_profiles.id
    WHERE public.bookings.id = NEW.booking_id;

    IF NEW.sender_id = booker_id THEN
      recipient_user_id := talent_user_id;
      SELECT booker_name FROM public.bookings WHERE id = NEW.booking_id INTO sender_name;
      link_path := '/talent-dashboard';
    ELSE
      recipient_user_id := booker_id;
      SELECT artist_name FROM public.talent_profiles WHERE user_id = NEW.sender_id INTO sender_name;
      link_path := '/booker-dashboard';
    END IF;
    
    notification_message := 'New message from ' || COALESCE(sender_name, 'a user') || ' regarding your ' || event_type || ' booking.';

    -- Insert the notification if a recipient was found
    IF recipient_user_id IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, message, booking_id, type, link_to)
      VALUES(recipient_user_id, notification_message, NEW.booking_id, 'new_message', link_path);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Revert send_message_email_notification function to booking-only
CREATE OR REPLACE FUNCTION public.send_message_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recipient_user_id UUID;
  booking_record RECORD;
  talent_user_id UUID;
  sender_name TEXT;
  service_role_key TEXT;
BEGIN
  -- Get service role key
  SELECT setting_value INTO service_role_key 
  FROM admin_settings 
  WHERE setting_key = 'service_role_key'
  LIMIT 1;
  
  IF service_role_key IS NULL OR service_role_key = '' THEN
    RETURN NEW;
  END IF;

  -- Handle booking messages only (remove event_request handling)
  IF NEW.booking_id IS NOT NULL AND NEW.is_admin_chat != true THEN
    -- Get booking details
    SELECT * INTO booking_record 
    FROM public.bookings 
    WHERE id = NEW.booking_id;
    
    IF booking_record IS NULL OR booking_record.event_type = 'admin_support' THEN
      RETURN NEW;
    END IF;
    
    -- Get talent user_id if talent exists
    IF booking_record.talent_id IS NOT NULL THEN
      SELECT user_id INTO talent_user_id 
      FROM public.talent_profiles 
      WHERE id = booking_record.talent_id;
    END IF;
    
    -- Determine recipient (who should get the email - not the sender)
    IF NEW.sender_id = booking_record.user_id THEN
      -- Booker sent message, notify talent
      recipient_user_id := talent_user_id;
      sender_name := booking_record.booker_name;
    ELSIF NEW.sender_id = talent_user_id THEN
      -- Talent sent message, notify booker
      recipient_user_id := booking_record.user_id;
      SELECT artist_name INTO sender_name 
      FROM public.talent_profiles 
      WHERE user_id = NEW.sender_id;
    ELSE
      -- Unknown sender, skip
      RETURN NEW;
    END IF;
    
    -- Skip if no recipient
    IF recipient_user_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Invoke send-notification-email function for booking message
    PERFORM
      net.http_post(
        url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'emailType', 'message',
          'userIds', jsonb_build_array(recipient_user_id),
          'bookingId', NEW.booking_id,
          'messageId', NEW.id
        )
      );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Remove get_admin_user_id function (if it was only added for event_request)
-- Note: Only drop if it's safe to do so - check if other parts of the system use it
-- DROP FUNCTION IF EXISTS public.get_admin_user_id();

-- 5. Ensure triggers exist (they should work with the reverted functions)
DROP TRIGGER IF EXISTS on_new_message_create_notification ON public.chat_messages;
CREATE TRIGGER on_new_message_create_notification
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_notification_for_new_message();

DROP TRIGGER IF EXISTS on_new_message_send_email ON public.chat_messages;
CREATE TRIGGER on_new_message_send_email
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.send_message_email_notification();

-- Note: The event_request_email_trigger from 20250115000000_fix_event_request_notifications.sql
-- is left in place as it handles event request creation emails, not chat messages.
-- If you want to remove that too, uncomment the following:
-- DROP TRIGGER IF EXISTS event_request_email_trigger ON public.event_requests;
-- DROP FUNCTION IF EXISTS public.send_event_request_email_notification();

