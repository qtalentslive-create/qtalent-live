-- Fix event request chat functionality
-- 1. Create get_admin_user_id() function
-- 2. Update create_notification_for_new_message to handle event_request messages
-- 3. Update send_message_email_notification to handle event_request messages and send admin emails
-- 4. Update RLS policies to allow talents to send messages to event_requests

-- 1. Create function to get admin user ID
CREATE OR REPLACE FUNCTION public.get_admin_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_id UUID;
BEGIN
  -- Get the first active admin user ID
  SELECT user_id INTO admin_id
  FROM public.admin_users
  WHERE is_active = true
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- If no admin found, try to find user with qtalentslive@gmail.com
  IF admin_id IS NULL THEN
    SELECT id INTO admin_id
    FROM auth.users
    WHERE email = 'qtalentslive@gmail.com'
    LIMIT 1;
  END IF;
  
  RETURN admin_id;
END;
$$;

-- 2. Update create_notification_for_new_message to handle event_request messages properly
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
  event_request_record RECORD;
  is_sender_talent BOOLEAN := FALSE;
  is_sender_admin BOOLEAN := FALSE;
  talent_artist_name TEXT;
BEGIN
  -- Determine the recipient based on whether it's a booking or event request
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

  ELSIF NEW.event_request_id IS NOT NULL THEN
    -- It's an Event Request chat
    SELECT user_id, booker_name, event_type
    INTO booker_id, sender_name, event_type
    FROM public.event_requests
    WHERE id = NEW.event_request_id;

    -- Check if sender is admin
    SELECT is_admin(NEW.sender_id) INTO is_sender_admin;
    
    -- Check if sender is a talent (has talent profile)
    SELECT EXISTS(
      SELECT 1 FROM public.talent_profiles 
      WHERE user_id = NEW.sender_id
    ) INTO is_sender_talent;
    
    -- Get talent artist name if sender is talent
    IF is_sender_talent THEN
      SELECT artist_name INTO talent_artist_name
      FROM public.talent_profiles
      WHERE user_id = NEW.sender_id;
    END IF;

    -- Determine recipient based on sender type
    IF NEW.sender_id = booker_id THEN
      -- Booker sent message to admin - no notification (admin gets email)
      recipient_user_id := NULL;
      link_path := '/admin/bookings';
    ELSIF is_sender_admin THEN
      -- Admin sent message to booker
      recipient_user_id := booker_id;
      sender_name := 'QTalent Team';
      link_path := '/booker-dashboard';
      notification_message := 'New message from ' || sender_name || ' regarding your ' || event_type || ' event request.';
    ELSIF is_sender_talent THEN
      -- Talent sent message to booker
      recipient_user_id := booker_id;
      sender_name := COALESCE(talent_artist_name, 'a talent');
      link_path := '/booker-dashboard';
      notification_message := 'New message from ' || sender_name || ' regarding your ' || event_type || ' event request.';
    ELSE
      -- Unknown sender, skip notification
      RETURN NEW;
    END IF;
  ELSE
    -- Neither booking_id nor event_request_id, skip
    RETURN NEW;
  END IF;

  -- Insert the notification if a recipient was found
  IF recipient_user_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, message, booking_id, event_request_id, type, link_to)
    VALUES(recipient_user_id, notification_message, NEW.booking_id, NEW.event_request_id, 'new_message', link_path);
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Update send_message_email_notification to handle event_request messages
CREATE OR REPLACE FUNCTION public.send_message_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recipient_user_id UUID;
  booking_record RECORD;
  event_request_record RECORD;
  talent_user_id UUID;
  sender_name TEXT;
  is_sender_talent BOOLEAN := FALSE;
  is_sender_admin BOOLEAN := FALSE;
  talent_artist_name TEXT;
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

  -- Handle booking messages
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

  -- Handle event_request messages
  ELSIF NEW.event_request_id IS NOT NULL THEN
    -- Get event request details
    SELECT * INTO event_request_record
    FROM public.event_requests
    WHERE id = NEW.event_request_id;
    
    IF event_request_record IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Check if sender is admin
    SELECT is_admin(NEW.sender_id) INTO is_sender_admin;
    
    -- Check if sender is a talent
    SELECT EXISTS(
      SELECT 1 FROM public.talent_profiles 
      WHERE user_id = NEW.sender_id
    ) INTO is_sender_talent;
    
    -- Get talent artist name if sender is talent
    IF is_sender_talent THEN
      SELECT artist_name INTO talent_artist_name
      FROM public.talent_profiles
      WHERE user_id = NEW.sender_id;
    END IF;

    -- Determine recipient and send appropriate emails
    IF NEW.sender_id = event_request_record.user_id THEN
      -- Booker sent message - send email to admin with event request details
      PERFORM
        net.http_post(
          url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
          ),
          body := jsonb_build_object(
            'emailType', 'admin_support_message',
            'eventRequestId', NEW.event_request_id,
            'messageId', NEW.id,
            'emailData', jsonb_build_object(
              'sender_name', event_request_record.booker_name,
              'sender_email', event_request_record.booker_email,
              'message_preview', NEW.content,
              'booker_name', event_request_record.booker_name,
              'booker_email', event_request_record.booker_email,
              'booker_phone', COALESCE(event_request_record.booker_phone, 'N/A'),
              'event_type', event_request_record.event_type,
              'event_date', event_request_record.event_date,
              'event_location', event_request_record.event_location,
              'event_duration', event_request_record.event_duration,
              'description', COALESCE(event_request_record.description, ''),
              'message_content', NEW.content,
              'event_request_id', NEW.event_request_id
            )
          )
        );
        
    ELSIF is_sender_admin THEN
      -- Admin sent message - send email to booker
      recipient_user_id := event_request_record.user_id;
      
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
            'eventRequestId', NEW.event_request_id,
            'messageId', NEW.id
          )
        );
        
    ELSIF is_sender_talent THEN
      -- Talent sent message - send email to booker
      recipient_user_id := event_request_record.user_id;
      
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
            'eventRequestId', NEW.event_request_id,
            'messageId', NEW.id
          )
        );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Update RLS policies to allow talents to send messages to event_requests
DROP POLICY IF EXISTS "Chat participants can send messages" ON public.chat_messages;

CREATE POLICY "Chat participants can send messages" 
ON public.chat_messages FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND (
    -- Admin can send to any chat
    is_admin(auth.uid()) OR
    -- Booking chat participants
    (booking_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE id = chat_messages.booking_id 
      AND (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.talent_profiles 
        WHERE id = bookings.talent_id AND user_id = auth.uid()
      ))
    )) OR
    -- Event request chat participants (booker, talent, and admin)
    (event_request_id IS NOT NULL AND (
      -- Booker can send to their own event request
      EXISTS (
        SELECT 1 FROM public.event_requests 
        WHERE id = chat_messages.event_request_id 
        AND user_id = auth.uid()
      ) OR
      -- Talent can send to event requests in their location
      EXISTS (
        SELECT 1 FROM public.event_requests er
        INNER JOIN public.talent_profiles tp ON tp.user_id = auth.uid()
        WHERE er.id = chat_messages.event_request_id
        AND er.event_location = tp.location
        AND NOT (auth.uid() = ANY(COALESCE(er.hidden_by_talents, '{}'::uuid[])))
      ) OR
      -- Admin can send to any event request
      is_admin(auth.uid())
    ))
  )
);

-- 5. Update RLS policies to allow talents to read messages from event_requests
DROP POLICY IF EXISTS "Chat participants can read messages" ON public.chat_messages;

CREATE POLICY "Chat participants can read messages" 
ON public.chat_messages FOR SELECT 
USING (
  -- Admin can see all messages
  is_admin(auth.uid()) OR
  -- Booking chat participants
  (booking_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE id = chat_messages.booking_id 
    AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.talent_profiles 
      WHERE id = bookings.talent_id AND user_id = auth.uid()
    ))
  )) OR
  -- Event request chat participants (booker, talent, and admin)
  (event_request_id IS NOT NULL AND (
    -- Booker can read messages from their own event request
    EXISTS (
      SELECT 1 FROM public.event_requests 
      WHERE id = chat_messages.event_request_id 
      AND user_id = auth.uid()
    ) OR
    -- Talent can read messages from event requests in their location
    EXISTS (
      SELECT 1 FROM public.event_requests er
      INNER JOIN public.talent_profiles tp ON tp.user_id = auth.uid()
      WHERE er.id = chat_messages.event_request_id
      AND er.event_location = tp.location
      AND NOT (auth.uid() = ANY(COALESCE(er.hidden_by_talents, '{}'::uuid[])))
    ) OR
    -- Admin can read messages from any event request
    is_admin(auth.uid())
  ))
);

-- 6. Ensure trigger exists for notifications
DROP TRIGGER IF EXISTS on_new_message_create_notification ON public.chat_messages;
CREATE TRIGGER on_new_message_create_notification
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_notification_for_new_message();

-- 7. Ensure trigger exists for email notifications
DROP TRIGGER IF EXISTS on_new_message_send_email ON public.chat_messages;
CREATE TRIGGER on_new_message_send_email
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.send_message_email_notification();

