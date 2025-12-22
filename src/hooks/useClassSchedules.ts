import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ClassSchedule {
  id: string;
  class_id: string;
  day: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'cancelled' | 'rescheduled';
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  rescheduled_to_id?: string | null;
  original_schedule_id?: string | null;
  classes?: {
    id: string;
    subject: string;
    code: string;
    room: string;
    department: string;
  };
}

export function useClassSchedules(classId?: string) {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSchedules = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('class_schedules')
        .select(`
          id,
          class_id,
          day,
          start_time,
          end_time,
          status,
          cancelled_at,
          cancel_reason,
          rescheduled_to_id,
          original_schedule_id,
          classes (
            id,
            subject,
            code,
            room,
            department
          )
        `)
        .order('day')
        .order('start_time');

      if (classId) {
        query = query.eq('class_id', classId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setSchedules(data as ClassSchedule[] || []);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError('Failed to fetch schedules');
    } finally {
      setIsLoading(false);
    }
  };

  const addSchedule = async (schedule: Omit<ClassSchedule, 'id' | 'classes' | 'status' | 'cancelled_at' | 'cancel_reason' | 'rescheduled_to_id' | 'original_schedule_id'>) => {
    const { data, error: insertError } = await supabase
      .from('class_schedules')
      .insert(schedule)
      .select(`
        id,
        class_id,
        day,
        start_time,
        end_time,
        status,
        cancelled_at,
        cancel_reason,
        rescheduled_to_id,
        original_schedule_id,
        classes (
          id,
          subject,
          code,
          room,
          department
        )
      `)
      .single();

    if (insertError) throw insertError;
    setSchedules(prev => [...prev, data as ClassSchedule]);
    return data;
  };

  const deleteSchedule = async (scheduleId: string) => {
    const { error: deleteError } = await supabase
      .from('class_schedules')
      .delete()
      .eq('id', scheduleId);

    if (deleteError) throw deleteError;
    setSchedules(prev => prev.filter(s => s.id !== scheduleId));
  };

  useEffect(() => {
    fetchSchedules();
  }, [user, classId]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('class-schedules-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_schedules',
        },
        () => {
          fetchSchedules();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, classId]);

  return {
    schedules,
    isLoading,
    error,
    addSchedule,
    deleteSchedule,
    refreshSchedules: fetchSchedules,
  };
}
