-- Fix event request email notifications
-- 1. Fix admin email type to use 'admin_new_event_request' instead of 'admin'
-- 2. Add logic to send emails to matching talents when event request is created
-- 3. Ensure the trigger exists and is properly configured

-- First, ensure we have the correct trigger (drop old ones if they exist)
DROP TRIGGER IF EXISTS event_request_email_trigger ON public.event_requests;
DROP TRIGGER IF EXISTS event_request_email_notification_trigger ON public.event_requests;

CREATE OR REPLACE FUNCTION public.send_event_request_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  service_role_key TEXT;
  matching_talent_user_ids UUID[];
  talent_user_id UUID;
BEGIN
  RAISE LOG 'Event request email trigger fired for request ID: %', NEW.id;
  
  -- Get service role key from admin_settings
  SELECT setting_value INTO service_role_key 
  FROM admin_settings 
  WHERE setting_key = 'service_role_key';
  
  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE LOG 'Service role key not found in admin_settings';
    RETURN NEW;
  END IF;

  -- Send admin notification for new event requests (FIX: use 'admin_new_event_request' instead of 'admin')
  BEGIN
    PERFORM net.http_post(
      url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'emailType', 'admin_new_event_request',
        'userIds', ARRAY[]::uuid[],
        'eventRequestId', NEW.id,
        'notificationType', 'new_event_request'
      )
    );
    RAISE LOG 'Admin notification sent for new event request: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Failed to send admin notification for event request: %', SQLERRM;
  END;

  -- Send confirmation to user who made the request
  BEGIN
    PERFORM net.http_post(
      url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'emailType', 'event_request_confirmation',
        'userIds', ARRAY[NEW.user_id],
        'eventRequestId', NEW.id
      )
    );
    RAISE LOG 'Event request confirmation sent to user: %', NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Failed to send event request confirmation to user: %', SQLERRM;
  END;

  -- NEW: Find matching talents and send them email notifications
  BEGIN
    -- Find all matching talent user IDs
    SELECT ARRAY_AGG(tp.user_id) INTO matching_talent_user_ids
    FROM talent_profiles tp
    WHERE tp.location = NEW.event_location
      AND (
        NEW.talent_type_needed IS NULL 
        OR LOWER(tp.act::text) = LOWER(NEW.talent_type_needed)
        OR LOWER(tp.act::text) LIKE '%' || LOWER(NEW.talent_type_needed) || '%'
      );

    -- Send email to each matching talent
    IF matching_talent_user_ids IS NOT NULL AND array_length(matching_talent_user_ids, 1) > 0 THEN
      FOREACH talent_user_id IN ARRAY matching_talent_user_ids
      LOOP
        BEGIN
          PERFORM net.http_post(
            url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || service_role_key
            ),
            body := jsonb_build_object(
              'emailType', 'event_request_talent_match',
              'userIds', ARRAY[talent_user_id],
              'eventRequestId', NEW.id
            )
          );
          RAISE LOG 'Event request notification sent to matching talent: %', talent_user_id;
        EXCEPTION WHEN OTHERS THEN
          RAISE LOG 'Failed to send event request notification to talent %: %', talent_user_id, SQLERRM;
        END;
      END LOOP;
    ELSE
      RAISE LOG 'No matching talents found for event request: %', NEW.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Failed to send notifications to matching talents: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists
CREATE TRIGGER event_request_email_trigger
  AFTER INSERT ON public.event_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.send_event_request_email_notification();

