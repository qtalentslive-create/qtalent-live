-- COMPLETE RESTORE: Restore chat system to original booking-only state
-- This completely reverts all event_request chat changes and restores original working state

-- ============================================================================
-- STEP 1: RESTORE RLS POLICIES TO ORIGINAL BOOKING-ONLY STATE
-- ============================================================================

-- Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "Chat participants can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat participants can read messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view messages for their bookings" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can create messages for their bookings" ON public.chat_messages;
DROP POLICY IF EXISTS "Enable participants and admin to read chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Enable participants to read messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Enable participants to send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Enable users to send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view their messages" ON public.chat_messages;

-- Restore original booking-only RLS policies with admin support
-- This matches the working state before event_request chat was added
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

-- ============================================================================
-- STEP 2: RESTORE ORIGINAL send_message_email_notification FUNCTION
-- ============================================================================

-- Restore to original booking-only version (from 20250826085221)
CREATE OR REPLACE FUNCTION public.send_message_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recipient_id UUID;
  service_role_key TEXT;
BEGIN
  RAISE LOG 'Message email trigger fired for message ID: %', NEW.id;
  
  -- Get service role key from admin_settings
  SELECT setting_value INTO service_role_key 
  FROM admin_settings 
  WHERE setting_key = 'service_role_key';
  
  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE LOG 'Service role key not found in admin_settings';
    RETURN NEW;
  END IF;

  -- Only handle booking messages (original booking-only logic)
  IF NEW.booking_id IS NOT NULL THEN
    -- Get the booking to find the recipient (other party in the conversation)
    SELECT 
      CASE 
        WHEN b.user_id = NEW.sender_id THEN tp.user_id  -- sender is booker, recipient is talent
        ELSE b.user_id  -- sender is talent, recipient is booker
      END
    INTO recipient_id
    FROM public.bookings b
    LEFT JOIN public.talent_profiles tp ON b.talent_id = tp.id
    WHERE b.id = NEW.booking_id;

    -- Only send email if there's a recipient (not the sender)
    IF recipient_id IS NOT NULL AND recipient_id != NEW.sender_id THEN
      BEGIN
        PERFORM net.http_post(
          url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
          ),
          body := jsonb_build_object(
            'emailType', 'message',
            'userIds', ARRAY[recipient_id],
            'messageId', NEW.id,
            'bookingId', NEW.booking_id
          )
        );
        RAISE LOG 'Message notification sent to user: %', recipient_id;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Failed to send message email: %', SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- STEP 3: RESTORE ORIGINAL create_notification_for_new_message FUNCTION
-- ============================================================================

-- Restore to booking-only version (remove all event_request logic)
CREATE OR REPLACE FUNCTION public.create_notification_for_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
  -- Only handle booking messages (original booking-only logic)
  IF NEW.booking_id IS NOT NULL THEN
    -- It's a Direct Booking chat
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
$function$;

-- ============================================================================
-- STEP 4: RESTORE TRIGGERS TO ORIGINAL STATE
-- ============================================================================

-- Drop all existing triggers
DROP TRIGGER IF EXISTS on_new_message_create_notification ON public.chat_messages;
DROP TRIGGER IF EXISTS on_new_message_send_email ON public.chat_messages;
DROP TRIGGER IF EXISTS message_email_notification_trigger ON public.chat_messages;

-- Restore original triggers (from 20250826085221)
CREATE TRIGGER message_email_notification_trigger
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW 
  EXECUTE FUNCTION public.send_message_email_notification();

-- Create notification trigger (if it doesn't exist from original setup)
CREATE TRIGGER on_new_message_create_notification
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_notification_for_new_message();

-- ============================================================================
-- STEP 5: VERIFY - Check what we restored
-- ============================================================================

-- Run these queries to verify:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'chat_messages';
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%message%';
-- SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'chat_messages';

