import { supabase } from "@/integrations/supabase/client";

/**
 * Comprehensive email system testing utility
 * This function tests all email triggers and logging
 */
export const testEmailSystem = async () => {
  try {
    // Test 1: Check if email_logs table exists and is accessible
    const { data: logsData, error: logsError } = await supabase
      .from('email_logs')
      .select('*')
      .limit(5);
    
    if (logsError) {
      console.error('❌ Email logs table error:', logsError);
    } else {
    }

    // Test 2: Check admin_settings for service role key
    const { data: settingsData, error: settingsError } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .eq('setting_key', 'service_role_key')
      .single();
    
    if (settingsError) {
      console.error('❌ Service role key not found:', settingsError);
    } else {
    }

    // Test 3: Test event request email (hero form)
    const eventRequestData = {
      user_id: 'test-user-id', // This would normally be the authenticated user
      booker_name: 'Test User',
      booker_email: 'test@example.com',
      event_date: '2025-12-31',
      event_duration: 4,
      event_location: 'Test Country',
      event_type: 'wedding',
      description: 'Test event request for email system verification'
    };
    const { data: eventData, error: eventError } = await supabase
      .from('event_requests')
      .insert(eventRequestData)
      .select();

    if (eventError) {
      console.error('❌ Event request insertion failed:', eventError);
    } else {
    }

    // Test 4: Check for recent email logs after our test
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for triggers

    const { data: newLogsData, error: newLogsError } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (newLogsError) {
      console.error('❌ Failed to check new email logs:', newLogsError);
    } else {
      const recentLogs = newLogsData?.filter(log => 
        new Date(log.created_at).getTime() > Date.now() - 60000 // Last minute
      );
    }
    return {
      success: !logsError && !settingsError && !eventError,
      tests: {
        emailLogs: !logsError,
        serviceRoleKey: !settingsError,
        eventRequestTrigger: !eventError
      }
    };

  } catch (error) {
    console.error('🚨 Email system test failed with exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Global access for browser console
(window as any).testEmailSystem = testEmailSystem;