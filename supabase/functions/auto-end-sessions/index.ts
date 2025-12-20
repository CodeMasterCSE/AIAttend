import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for expired sessions...');

    // Get all active sessions
    const { data: activeSessions, error: fetchError } = await supabase
      .from('attendance_sessions')
      .select('id, class_id, date, start_time, session_duration_minutes')
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching active sessions:', fetchError);
      throw fetchError;
    }

    if (!activeSessions || activeSessions.length === 0) {
      console.log('No active sessions found');
      return new Response(JSON.stringify({ message: 'No active sessions', ended: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${activeSessions.length} active sessions`);

    const now = new Date();
    const sessionsToEnd: string[] = [];

    for (const session of activeSessions) {
      // Parse session start time
      const [hours, minutes, seconds] = session.start_time.split(':').map(Number);
      const sessionStart = new Date(session.date);
      sessionStart.setHours(hours, minutes, seconds || 0, 0);

      // Calculate session end time
      const sessionEndTime = new Date(sessionStart.getTime() + session.session_duration_minutes * 60 * 1000);

      if (now >= sessionEndTime) {
        console.log(`Session ${session.id} has expired (started: ${sessionStart.toISOString()}, duration: ${session.session_duration_minutes}min, end: ${sessionEndTime.toISOString()})`);
        sessionsToEnd.push(session.id);
      }
    }

    if (sessionsToEnd.length === 0) {
      console.log('No sessions need to be ended');
      return new Response(JSON.stringify({ message: 'No expired sessions', ended: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // End expired sessions
    const endTime = now.toTimeString().slice(0, 8);

    for (const sessionId of sessionsToEnd) {
      // Get enrolled students who haven't marked attendance
      const { data: session } = await supabase
        .from('attendance_sessions')
        .select('class_id')
        .eq('id', sessionId)
        .single();

      if (session) {
        // Get all enrolled students
        const { data: enrollments } = await supabase
          .from('class_enrollments')
          .select('student_id')
          .eq('class_id', session.class_id);

        // Get students who already have records
        const { data: existingRecords } = await supabase
          .from('attendance_records')
          .select('student_id')
          .eq('session_id', sessionId);

        const presentIds = new Set((existingRecords || []).map(r => r.student_id));
        
        // Mark absent students who haven't checked in
        const absentRecords = (enrollments || [])
          .filter(e => !presentIds.has(e.student_id))
          .map(e => ({
            session_id: sessionId,
            class_id: session.class_id,
            student_id: e.student_id,
            status: 'absent',
            method_used: 'auto',
            manual_reason: 'Automatically marked absent - session ended',
          }));

        if (absentRecords.length > 0) {
          const { error: insertError } = await supabase
            .from('attendance_records')
            .insert(absentRecords);

          if (insertError) {
            console.error(`Error inserting absent records for session ${sessionId}:`, insertError);
          } else {
            console.log(`Marked ${absentRecords.length} students as absent for session ${sessionId}`);
          }
        }
      }

      // End the session
      const { error: updateError } = await supabase
        .from('attendance_sessions')
        .update({ is_active: false, end_time: endTime })
        .eq('id', sessionId);

      if (updateError) {
        console.error(`Error ending session ${sessionId}:`, updateError);
      } else {
        console.log(`Session ${sessionId} ended successfully`);
      }
    }

    return new Response(JSON.stringify({ 
      message: `Ended ${sessionsToEnd.length} expired sessions`,
      ended: sessionsToEnd.length,
      sessionIds: sessionsToEnd,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in auto-end-sessions:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
