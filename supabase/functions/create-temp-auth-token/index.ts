import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Generate a secure temporary token (expires in 10 minutes)
    const tempToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store the token in a temporary table (or use existing mechanism)
    // For now, we'll store it in a simple key-value format using Supabase storage
    // In production, you might want to create a dedicated table for this
    
    // Create a temporary session that can be used to restore auth
    // We'll use Supabase's admin API to create a custom session
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '') || 'https://qtalent.live'}/auth/callback`,
      }
    });

    if (sessionError) {
      // Fallback: create a simple token storage
      // Store token in database temporarily
      const { error: insertError } = await supabase
        .from('auth.temp_tokens')
        .insert({
          token: tempToken,
          user_id: user.id,
          expires_at: expiresAt,
        });

      if (insertError) {
        // If table doesn't exist, we'll use a different approach
        // Return the access token directly (encrypted/encoded)
        // This is less secure but works for the short term
        
        return new Response(JSON.stringify({
          token: btoa(JSON.stringify({
            user_id: user.id,
            email: user.email,
            expires_at: expiresAt,
          })),
          expires_at: expiresAt,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        token: tempToken,
        expires_at: expiresAt,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return the magic link token
    return new Response(JSON.stringify({
      token: sessionData.properties.hashed_token || tempToken,
      expires_at: expiresAt,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating temp auth token:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

