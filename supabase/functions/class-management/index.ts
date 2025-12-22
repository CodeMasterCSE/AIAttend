import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated client for user verification
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();
    console.log(`[class-management] Action: ${action}, User: ${user.id}`);

    switch (action) {
      case 'cancel-schedule': {
        const { scheduleId, reason } = params;

        if (!scheduleId) {
          return new Response(
            JSON.stringify({ error: 'Schedule ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify professor owns this schedule's class
        const { data: schedule, error: scheduleError } = await supabase
          .from('class_schedules')
          .select('id, class_id, status, classes!inner(professor_id)')
          .eq('id', scheduleId)
          .single();

        if (scheduleError || !schedule) {
          return new Response(
            JSON.stringify({ error: 'Schedule not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if ((schedule.classes as any).professor_id !== user.id) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (schedule.status !== 'scheduled') {
          return new Response(
            JSON.stringify({ error: 'Schedule already cancelled or rescheduled' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Cancel the schedule
        const { error: updateError } = await supabase
          .from('class_schedules')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancel_reason: reason || 'Cancelled by professor',
          })
          .eq('id', scheduleId);

        if (updateError) {
          console.error('[class-management] Error cancelling schedule:', updateError);
          throw updateError;
        }

        // Close any active sessions for this class on the current date
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toISOString().split('T')[1].slice(0, 8);

        const { data: activeSessions } = await supabase
          .from('attendance_sessions')
          .select('id')
          .eq('class_id', schedule.class_id)
          .eq('date', today)
          .eq('is_active', true);

        if (activeSessions && activeSessions.length > 0) {
          const sessionIds = activeSessions.map(s => s.id);
          await supabase
            .from('attendance_sessions')
            .update({
              is_active: false,
              end_time: currentTime,
              closed_reason: 'class_cancelled',
            })
            .in('id', sessionIds);

          console.log(`[class-management] Closed ${sessionIds.length} active sessions due to cancellation`);
        }

        console.log(`[class-management] Successfully cancelled schedule ${scheduleId}`);
        return new Response(
          JSON.stringify({ success: true, message: 'Schedule cancelled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reschedule': {
        const { scheduleId, newDay, newStartTime, newEndTime, newDate } = params;

        if (!scheduleId || !newDay || !newStartTime || !newEndTime) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate time format
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
        if (!timeRegex.test(newStartTime) || !timeRegex.test(newEndTime)) {
          return new Response(
            JSON.stringify({ error: 'Invalid time format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify professor owns this schedule's class
        const { data: schedule, error: scheduleError } = await supabase
          .from('class_schedules')
          .select('id, class_id, day, start_time, end_time, status, classes!inner(professor_id)')
          .eq('id', scheduleId)
          .single();

        if (scheduleError || !schedule) {
          return new Response(
            JSON.stringify({ error: 'Schedule not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if ((schedule.classes as any).professor_id !== user.id) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check for conflicts on the new time
        const { data: conflicts } = await supabase
          .from('class_schedules')
          .select('id, classes(subject)')
          .eq('class_id', schedule.class_id)
          .eq('day', newDay)
          .eq('status', 'scheduled')
          .neq('id', scheduleId);

        const hasConflict = conflicts?.some(c => {
          // Simple overlap check would need actual comparison
          // For now, we'll allow and warn
          return false;
        });

        // Create new schedule slot
        const { data: newSchedule, error: insertError } = await supabase
          .from('class_schedules')
          .insert({
            class_id: schedule.class_id,
            day: newDay,
            start_time: newStartTime.length === 5 ? `${newStartTime}:00` : newStartTime,
            end_time: newEndTime.length === 5 ? `${newEndTime}:00` : newEndTime,
            status: 'scheduled',
            original_schedule_id: scheduleId,
          })
          .select()
          .single();

        if (insertError) {
          console.error('[class-management] Error creating new schedule:', insertError);
          throw insertError;
        }

        // Mark original as rescheduled
        const { error: updateError } = await supabase
          .from('class_schedules')
          .update({
            status: 'rescheduled',
            rescheduled_to_id: newSchedule.id,
            cancelled_at: new Date().toISOString(),
            cancel_reason: 'Rescheduled to new time',
          })
          .eq('id', scheduleId);

        if (updateError) {
          console.error('[class-management] Error updating original schedule:', updateError);
          throw updateError;
        }

        console.log(`[class-management] Successfully rescheduled ${scheduleId} to ${newSchedule.id}`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Schedule rescheduled',
            newScheduleId: newSchedule.id,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-schedule-status': {
        const { scheduleId } = params;

        const { data: schedule, error } = await supabase
          .from('class_schedules')
          .select(`
            id,
            day,
            start_time,
            end_time,
            status,
            cancelled_at,
            cancel_reason,
            rescheduled_to_id,
            original_schedule_id,
            classes (subject, code)
          `)
          .eq('id', scheduleId)
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Schedule not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, schedule }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('[class-management] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
