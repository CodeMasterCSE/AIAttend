import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

function maskId(id: string, visible = 6) {
  if (!id) return '(empty)';
  if (id.length <= visible * 2) return `${id.slice(0, 2)}…${id.slice(-2)}`;
  return `${id.slice(0, visible)}…${id.slice(-visible)}`;
}

interface Schedule {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
  classes: {
    subject: string;
    code: string;
    room: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const supabaseClient = createClient(
      SUPABASE_URL!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, code, redirectUri, schedules } = await req.json();
    console.log(`Google Calendar action: ${action} for user: ${user.id}`);

    if (action === 'exchange-code') {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        console.error('Missing Google OAuth env vars', {
          hasClientId: !!GOOGLE_CLIENT_ID,
          hasClientSecret: !!GOOGLE_CLIENT_SECRET,
          clientIdMasked: GOOGLE_CLIENT_ID ? maskId(GOOGLE_CLIENT_ID) : null,
        });
        return new Response(JSON.stringify({
          error: 'google_oauth_not_configured',
          message: 'Google OAuth is not configured on the backend.',
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Exchange authorization code for tokens
      console.log('Starting token exchange', {
        clientIdMasked: maskId(GOOGLE_CLIENT_ID),
        redirectUri,
      });

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenResponse.json();
      console.log('Token exchange response status:', tokenResponse.status);

      if (!tokenResponse.ok) {
        // Safe logs (never log client_secret)
        console.error('Token exchange failed (google)', {
          status: tokenResponse.status,
          error: tokenData?.error,
          error_description: tokenData?.error_description,
          clientIdMasked: maskId(GOOGLE_CLIENT_ID),
          redirectUri,
        });

        return new Response(JSON.stringify({
          error: tokenData?.error ?? 'token_exchange_failed',
          error_description: tokenData?.error_description ?? 'Failed to exchange code',
          status: tokenResponse.status,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);

      // Upsert tokens
      const { error: upsertError } = await supabaseAdmin
        .from('calendar_tokens')
        .upsert({
          user_id: user.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expiry: tokenExpiry.toISOString(),
        }, { onConflict: 'user_id' });

      if (upsertError) {
        console.error('Failed to store tokens:', upsertError);
        throw new Error('Failed to store tokens');
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'check-connection') {
      const { data: tokens } = await supabaseClient
        .from('calendar_tokens')
        .select('id, token_expiry')
        .eq('user_id', user.id)
        .single();

      return new Response(JSON.stringify({ connected: !!tokens }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'disconnect') {
      // Delete tokens and synced events
      await supabaseClient.from('calendar_synced_events').delete().eq('user_id', user.id);
      await supabaseClient.from('calendar_tokens').delete().eq('user_id', user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'sync-schedules') {
      // Get tokens
      const { data: tokens, error: tokensError } = await supabaseAdmin
        .from('calendar_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (tokensError || !tokens) {
        throw new Error('Calendar not connected');
      }

      // Refresh token if expired
      let accessToken = tokens.access_token;
      if (new Date(tokens.token_expiry) < new Date()) {
        console.log('Refreshing expired token');
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID!,
            client_secret: GOOGLE_CLIENT_SECRET!,
            refresh_token: tokens.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        const refreshData = await refreshResponse.json();
        if (!refreshResponse.ok) {
          console.error('Token refresh failed:', refreshData);
          throw new Error('Failed to refresh token');
        }

        accessToken = refreshData.access_token;
        const newExpiry = new Date(Date.now() + refreshData.expires_in * 1000);

        await supabaseAdmin
          .from('calendar_tokens')
          .update({
            access_token: accessToken,
            token_expiry: newExpiry.toISOString(),
          })
          .eq('user_id', user.id);
      }

      // Get already synced events
      const { data: syncedEvents } = await supabaseClient
        .from('calendar_synced_events')
        .select('schedule_id, google_event_id')
        .eq('user_id', user.id);

      const syncedMap = new Map(syncedEvents?.map(e => [e.schedule_id, e.google_event_id]) || []);

      let created = 0;
      let skipped = 0;

      for (const schedule of schedules as Schedule[]) {
        if (syncedMap.has(schedule.id)) {
          skipped++;
          continue;
        }

        // Calculate dates for next occurrence of this day
        const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          .indexOf(schedule.day.toLowerCase());
        
        const today = new Date();
        const todayDay = today.getDay();
        let daysUntil = dayIndex - todayDay;
        if (daysUntil < 0) daysUntil += 7;
        
        const eventDate = new Date(today);
        eventDate.setDate(today.getDate() + daysUntil);
        
        const dateStr = eventDate.toISOString().split('T')[0];
        const startDateTime = `${dateStr}T${schedule.start_time}:00`;
        const endDateTime = `${dateStr}T${schedule.end_time}:00`;

        // Create calendar event with weekly recurrence
        const event = {
          summary: `${schedule.classes.code} - ${schedule.classes.subject}`,
          location: schedule.classes.room,
          description: `Class: ${schedule.classes.subject}\nRoom: ${schedule.classes.room}`,
          start: {
            dateTime: startDateTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: endDateTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          recurrence: ['RRULE:FREQ=WEEKLY;COUNT=16'], // ~1 semester
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 30 },
              { method: 'popup', minutes: 10 },
            ],
          },
        };

        console.log(`Creating event for schedule ${schedule.id}:`, event.summary);

        const calResponse = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          }
        );

        if (!calResponse.ok) {
          const errorText = await calResponse.text();
          console.error(`Failed to create event for ${schedule.id}:`, errorText);
          continue;
        }

        const calEvent = await calResponse.json();
        
        // Store sync record
        await supabaseAdmin
          .from('calendar_synced_events')
          .insert({
            user_id: user.id,
            schedule_id: schedule.id,
            google_event_id: calEvent.id,
          });

        created++;
      }

      console.log(`Sync complete: ${created} created, ${skipped} skipped`);

      return new Response(JSON.stringify({ 
        success: true, 
        created, 
        skipped,
        total: schedules.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Google Calendar error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
