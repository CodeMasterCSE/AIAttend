import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ActiveSession {
  id: string;
  class_id: string;
  date: string;
  start_time: string;
  is_active: boolean;
  attendance_window_minutes: number;
  session_duration_minutes: number;
  classes: {
    id: string;
    subject: string;
    code: string;
    room: string;
  };
}

export function useStudentSessions() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchActiveSessions = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      // 1. Fetch all active sessions
      const { data: sessionsData, error: fetchError } = await supabase
        .from('attendance_sessions')
        .select(`
          id,
          class_id,
          date,
          start_time,
          is_active,
          attendance_window_minutes,
          session_duration_minutes,
          classes (
            id,
            subject,
            code,
            room
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (!sessionsData || sessionsData.length === 0) {
        setSessions([]);
        return;
      }

      // 2. Fetch existing attendance records for this student and these sessions
      const sessionIds = sessionsData.map(s => s.id);
      const { data: records, error: recordsError } = await supabase
        .from('attendance_records')
        .select('session_id')
        .eq('student_id', user.id)
        .in('session_id', sessionIds);

      if (recordsError) throw recordsError;

      // 3. Filter out sessions that already have a record
      const attendedSessionIds = new Set((records || []).map(r => r.session_id));
      const filteredSessions = sessionsData.filter(session => !attendedSessionIds.has(session.id));

      setSessions(filteredSessions as ActiveSession[]);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Failed to fetch attendance sessions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    // Sub to sessions
    const sessionsChannel = supabase
      .channel('student-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_sessions',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.is_active) {
            fetchActiveSessions();
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.is_active === false) {
              setSessions((prev) => prev.filter((s) => s.id !== payload.new.id));
            } else {
              fetchActiveSessions();
            }
          } else if (payload.eventType === 'DELETE') {
            setSessions((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Sub to my attendance records (to auto-remove session on check-in)
    const recordsChannel = supabase
      .channel('student-records-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_records',
          filter: `student_id=eq.${user.id}`,
        },
        () => {
          fetchActiveSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(recordsChannel);
    };
  }, [user]);

  return {
    sessions,
    isLoading,
    error,
    refreshSessions: fetchActiveSessions,
  };
}
