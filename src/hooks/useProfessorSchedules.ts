import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProfessorSchedule {
  id: string;
  class_id: string;
  day: string;
  start_time: string;
  end_time: string;
  classes: {
    id: string;
    subject: string;
    code: string;
    room: string;
    department: string;
  };
}

export function useProfessorSchedules() {
  const [schedules, setSchedules] = useState<ProfessorSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classIds, setClassIds] = useState<string[]>([]);
  const { user } = useAuth();

  const fetchSchedules = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      // First get the professor's classes
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id')
        .eq('professor_id', user.id);

      if (classesError) throw classesError;

      if (!classes || classes.length === 0) {
        setSchedules([]);
        setClassIds([]);
        setIsLoading(false);
        return;
      }

      const ids = classes.map(c => c.id);
      setClassIds(ids);

      // Then get schedules for those classes
      const { data, error: fetchError } = await supabase
        .from('class_schedules')
        .select(`
          id,
          class_id,
          day,
          start_time,
          end_time,
          classes (
            id,
            subject,
            code,
            room,
            department
          )
        `)
        .in('class_id', ids)
        .order('day')
        .order('start_time');

      if (fetchError) throw fetchError;
      setSchedules((data as ProfessorSchedule[]) || []);
    } catch (err) {
      console.error('Error fetching professor schedules:', err);
      setError('Failed to fetch schedules');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Real-time subscription for schedule changes
  useEffect(() => {
    if (!user || classIds.length === 0) return;

    const channel = supabase
      .channel('professor-schedules')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_schedules',
        },
        (payload) => {
          const record = payload.new as ProfessorSchedule | null;
          const oldRecord = payload.old as { id: string } | null;
          
          // Only react to changes for this professor's classes
          if (payload.eventType === 'INSERT' && record && classIds.includes(record.class_id)) {
            fetchSchedules(); // Refetch to get full data with joins
          } else if (payload.eventType === 'DELETE' && oldRecord) {
            setSchedules(prev => prev.filter(s => s.id !== oldRecord.id));
          } else if (payload.eventType === 'UPDATE' && record && classIds.includes(record.class_id)) {
            fetchSchedules(); // Refetch to get updated data with joins
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, classIds, fetchSchedules]);

  return {
    schedules,
    isLoading,
    error,
    refreshSchedules: fetchSchedules,
  };
}
