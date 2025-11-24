/**
 * Auth Navigation Utility
 * Handles navigation between Capacitor app and website while preserving authentication
 */

import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";

const WEBSITE_URL = "https://qtalent.live";

export interface NavigateToPricingOptions {
  plan?: 'monthly' | 'yearly';
  returnTo?: 'app' | 'web';
}

/**
 * Opens the pricing page with authentication preserved
 * In Capacitor: Opens in external browser with session token
 * In Web: Navigates normally
 */
export async function navigateToPricing(options: NavigateToPricingOptions = {}) {
  const isNativeApp = Capacitor.isNativePlatform();
  
  if (!isNativeApp) {
    // Web: navigate normally
    const params = new URLSearchParams();
    if (options.plan) {
      params.set('plan', options.plan);
    }
    const url = `/pricing${params.toString() ? `?${params.toString()}` : ''}`;
    window.location.href = url;
    return;
  }

  // Capacitor: Get current session and pass to website
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      // No session, just open pricing
      openPricingInBrowser(options);
      return;
    }

    // Create URL with session information
    // We'll pass the access token in a secure way
    const params = new URLSearchParams();
    params.set('source', 'app');
    params.set('returnTo', options.returnTo || 'app');
    
    if (options.plan) {
      params.set('plan', options.plan);
    }

    // Encode session token securely (base64 for URL-safe encoding)
    // The access token is already JWT, we'll pass it for session restoration
    const sessionData = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user_id: session.user.id,
    };

    // Encode as base64 URL-safe string
    const encodedSession = btoa(JSON.stringify(sessionData));
    params.set('session', encodedSession);

    const pricingUrl = `${WEBSITE_URL}/pricing?${params.toString()}`;
    
    await Browser.open({
      url: pricingUrl,
      toolbarColor: "#0A0118",
    });
  } catch (error) {
    console.error('Error navigating to pricing:', error);
    // Fallback: open without session
    openPricingInBrowser(options);
  }
}

/**
 * Opens pricing page in browser without session (fallback)
 */
function openPricingInBrowser(options: NavigateToPricingOptions) {
  const params = new URLSearchParams();
  params.set('source', 'app');
  if (options.plan) {
    params.set('plan', options.plan);
  }
  const pricingUrl = `${WEBSITE_URL}/pricing?${params.toString()}`;
  
  Browser.open({
    url: pricingUrl,
    toolbarColor: "#0A0118",
  }).catch(() => {
    // Final fallback
    window.location.href = pricingUrl;
  });
}

/**
 * Restores Supabase session from URL parameters
 * Called on the website when user arrives from Capacitor app
 */
export async function restoreSessionFromUrl(): Promise<boolean> {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedSession = urlParams.get('session');

    if (!encodedSession) {
      return false;
    }

    // Decode session data
    const sessionData = JSON.parse(atob(encodedSession));
    
    // Set the session in Supabase
    const { data, error } = await supabase.auth.setSession({
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token,
    });

    if (error || !data.session) {
      console.error('Failed to restore session:', error);
      return false;
    }

    // Clean up URL parameter for security
    urlParams.delete('session');
    const newUrl = window.location.pathname + 
      (urlParams.toString() ? `?${urlParams.toString()}` : '');
    window.history.replaceState({}, '', newUrl);

    return true;
  } catch (error) {
    console.error('Error restoring session from URL:', error);
    return false;
  }
}

/**
 * Gets the return destination after payment
 * Returns 'app' if user came from Capacitor, 'web' otherwise
 */
export function getReturnDestination(): 'app' | 'web' {
  const urlParams = new URLSearchParams(window.location.search);
  const returnTo = urlParams.get('returnTo');
  const source = urlParams.get('source');
  
  if (returnTo === 'app' || source === 'app') {
    return 'app';
  }
  
  return 'web';
}

/**
 * Navigates back to the app after successful payment
 * Returns true if navigation was attempted
 */
export async function navigateBackToApp(): Promise<boolean> {
  const isNativeApp = Capacitor.isNativePlatform();
  
  if (!isNativeApp) {
    // On website, try to open the app via deep link
    // Use the app ID as deep link scheme
    const appUrl = 'live.qtalent.app://subscription-success';
    
    // Try deep link first
    try {
      // Create a hidden iframe to attempt deep link
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = appUrl;
      document.body.appendChild(iframe);
      
      // Clean up after attempt
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
      
      // Also try direct navigation as fallback
      window.location.href = appUrl;
      
      // Return true to indicate we attempted navigation
      // User can manually return to app or continue on website
      return true;
    } catch (error) {
      console.error('Deep link failed:', error);
      // If deep link fails, user can manually return to app
      return false;
    }
  }

  // Already in app, just navigate
  window.location.href = '/talent-dashboard';
  return true;
}

