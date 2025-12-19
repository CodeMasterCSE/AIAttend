import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WeeklyTimetable } from '@/components/student/WeeklyTimetable';
import { GoogleCalendarSync } from '@/components/calendar/GoogleCalendarSync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Clock, MapPin, BookOpen } from 'lucide-react';
import { ClassSchedule } from '@/hooks/useClassSchedules';

export default function TimetablePage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayClasses, setTodayClasses] = useState<ClassSchedule[]>([]);

  useEffect(() => {
    const fetchStudentSchedules = async () => {
      if (!user) return;

      try {
        // Get enrolled classes
        const { data: enrollments, error: enrollError } = await supabase
          .from('class_enrollments')
          .select('class_id')
          .eq('student_id', user.id);

        if (enrollError) throw enrollError;

        if (!enrollments || enrollments.length === 0) {
          setSchedules([]);
          setIsLoading(false);
          return;
        }

        const classIds = enrollments.map(e => e.class_id);

        // Get schedules for enrolled classes
        const { data: scheduleData, error: scheduleError } = await supabase
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
          .order('start_time');

        if (scheduleError) throw scheduleError;

        setSchedules(scheduleData as ClassSchedule[] || []);

        // Get today's classes
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = days[new Date().getDay()];
        const todaysSchedules = (scheduleData as ClassSchedule[] || []).filter(
          s => s.day.toLowerCase() === today
        );
        setTodayClasses(todaysSchedules);
      } catch (error) {
        console.error('Error fetching schedules:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentSchedules();
  }, [user]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Timetable</h1>
            <p className="text-muted-foreground">Your weekly class schedule</p>
          </div>
          <GoogleCalendarSync schedules={schedules} />
        </div>

        {/* Today's Classes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Today's Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayClasses.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No classes scheduled for today</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {todayClasses.map(schedule => (
                  <div
                    key={schedule.id}
                    className="p-4 rounded-xl border border-primary/20 bg-primary/5"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline">{schedule.classes?.code}</Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTime(schedule.start_time)}
                      </div>
                    </div>
                    <h3 className="font-medium">{schedule.classes?.subject}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                      <MapPin className="w-3 h-3" />
                      {schedule.classes?.room}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Timetable */}
        <WeeklyTimetable schedules={schedules} isLoading={isLoading} />
      </div>
    </DashboardLayout>
  );
}
