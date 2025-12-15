import { useState, useEffect } from 'react';
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
  const { user } = useAuth();

  const fetchSchedules = async () => {
    if (!user) return;

    try {
      // First get the professor's classes
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id')
        .eq('professor_id', user.id);

      if (classesError) throw classesError;

      if (!classes || classes.length === 0) {
        setSchedules([]);
        setIsLoading(false);
        return;
      }

      const classIds = classes.map(c => c.id);

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
        .in('class_id', classIds)
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
  };

  useEffect(() => {
    fetchSchedules();
  }, [user]);

  return {
    schedules,
    isLoading,
    error,
    refreshSchedules: fetchSchedules,
  };
}
