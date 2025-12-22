import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[auto-end-sessions] Starting automatic session closure check...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current UTC time
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toISOString().split('T')[1].slice(0, 8);

    console.log(`[auto-end-sessions] Current UTC: ${currentDate} ${currentTime}`);

    // Find all active sessions
    const { data: activeSessions, error: fetchError } = await supabase
      .from('attendance_sessions')
      .select('id, class_id, date, start_time, session_duration_minutes')
      .eq('is_active', true);

    if (fetchError) {
      console.error('[auto-end-sessions] Error fetching sessions:', fetchError);
      throw fetchError;
    }

    console.log(`[auto-end-sessions] Found ${activeSessions?.length || 0} active sessions`);

    const sessionsToClose: string[] = [];

    for (const session of activeSessions || []) {
      // Calculate session end time
      const sessionStartTime = new Date(`${session.date}T${session.start_time}Z`);
      const sessionDurationMinutes = session.session_duration_minutes ?? 60;
      const sessionEndTime = new Date(sessionStartTime.getTime() + sessionDurationMinutes * 60 * 1000);

      if (now >= sessionEndTime) {
        console.log(`[auto-end-sessions] Session ${session.id} has expired (end time: ${sessionEndTime.toISOString()})`);
        sessionsToClose.push(session.id);
      }
    }

    if (sessionsToClose.length > 0) {
      console.log(`[auto-end-sessions] Closing ${sessionsToClose.length} expired sessions...`);

      // Close expired sessions
      const { error: updateError } = await supabase
        .from('attendance_sessions')
        .update({ 
          is_active: false, 
          end_time: currentTime,
          closed_reason: 'time_expired'
        })
        .in('id', sessionsToClose);

      if (updateError) {
        console.error('[auto-end-sessions] Error closing sessions:', updateError);
        throw updateError;
      }

      // Mark remaining enrolled students as absent for closed sessions
      for (const sessionId of sessionsToClose) {
        const session = activeSessions?.find(s => s.id === sessionId);
        if (!session) continue;

        // Get enrolled students who haven't marked attendance
        const { data: enrolledStudents, error: enrollError } = await supabase
          .from('class_enrollments')
          .select('student_id')
          .eq('class_id', session.class_id);

        if (enrollError) {
          console.error(`[auto-end-sessions] Error fetching enrollments for session ${sessionId}:`, enrollError);
          continue;
        }

        // Get students who already marked attendance
        const { data: markedStudents, error: markedError } = await supabase
          .from('attendance_records')
          .select('student_id')
          .eq('session_id', sessionId);

        if (markedError) {
          console.error(`[auto-end-sessions] Error fetching attendance for session ${sessionId}:`, markedError);
          continue;
        }

        const markedIds = new Set(markedStudents?.map(s => s.student_id) || []);
        const absentStudents = (enrolledStudents || [])
          .filter(e => !markedIds.has(e.student_id))
          .map(e => e.student_id);

        if (absentStudents.length > 0) {
          console.log(`[auto-end-sessions] Marking ${absentStudents.length} students as absent for session ${sessionId}`);

          const absentRecords = absentStudents.map(studentId => ({
            session_id: sessionId,
            class_id: session.class_id,
            student_id: studentId,
            status: 'absent',
            method_used: 'auto',
            late_submission: false,
          }));

          const { error: insertError } = await supabase
            .from('attendance_records')
            .insert(absentRecords);

          if (insertError) {
            console.error(`[auto-end-sessions] Error inserting absent records for session ${sessionId}:`, insertError);
          }
        }
      }

      console.log(`[auto-end-sessions] Successfully closed ${sessionsToClose.length} sessions`);
    }

    const duration = Date.now() - startTime;
    console.log(`[auto-end-sessions] Completed in ${duration}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        closedSessions: sessionsToClose.length,
        totalActive: activeSessions?.length || 0,
        duration 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[auto-end-sessions] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
