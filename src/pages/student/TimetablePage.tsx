import { useEffect, useState, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WeeklyTimetable } from '@/components/student/WeeklyTimetable';
import { GoogleCalendarSync } from '@/components/calendar/GoogleCalendarSync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Clock, MapPin, BookOpen, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { ClassSchedule } from '@/hooks/useClassSchedules';
import { ScheduleStatusBadge } from '@/components/common/ScheduleStatusBadge';
import { format } from 'date-fns';

export default function TimetablePage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrolledClassIds, setEnrolledClassIds] = useState<string[]>([]);

  const fetchStudentSchedules = useCallback(async () => {
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
        setEnrolledClassIds([]);
        setIsLoading(false);
        return;
      }

      const classIds = enrollments.map(e => e.class_id);
      setEnrolledClassIds(classIds);

      // Get schedules for enrolled classes with status fields
      const { data: scheduleData, error: scheduleError } = await supabase
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
        .in('class_id', classIds)
        .order('start_time');

      if (scheduleError) throw scheduleError;

      setSchedules(scheduleData as ClassSchedule[] || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStudentSchedules();
  }, [fetchStudentSchedules]);

  // Real-time subscription for schedule changes
  useEffect(() => {
    if (!user || enrolledClassIds.length === 0) return;

    const channel = supabase
      .channel('student-schedules')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_schedules',
        },
        (payload) => {
          const record = payload.new as ClassSchedule | null;

          // Only react to changes for enrolled classes
          if (record && enrolledClassIds.includes(record.class_id)) {
            fetchStudentSchedules();
          } else if (payload.eventType === 'DELETE') {
            fetchStudentSchedules();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, enrolledClassIds, fetchStudentSchedules]);

  // Filter for active (non-cancelled) sessions for workload calculations
  const [processedSchedules, setProcessedSchedules] = useState<ClassSchedule[]>([]);

  useEffect(() => {
    const now = new Date();
    // Get start of current week (Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Get end of current week (Saturday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const isWithinCurrentWeek = (dateString: string | null | undefined) => {
      if (!dateString) return false;
      const date = new Date(dateString);
      return date >= startOfWeek && date <= endOfWeek;
    };

    // First pass: identify "stale" modifications (modifications from previous weeks)
    // and find the IDs of temporary slots that should be ignored
    const staleScheduleIds = new Set<string>();
    const idsToIgnore = new Set<string>();

    schedules.forEach(s => {
      if (s.status === 'cancelled' || s.status === 'rescheduled') {
        if (!isWithinCurrentWeek(s.cancelled_at)) {
          staleScheduleIds.add(s.id);
          // If it was a stale reschedule, we must ignore the corresponding "new" slot
          if (s.status === 'rescheduled' && s.rescheduled_to_id) {
            idsToIgnore.add(s.rescheduled_to_id);
          }
        }
      }
    });

    // Second pass: build the final list of schedules to display
    const processed = schedules
      .filter(s => !idsToIgnore.has(s.id)) // Remove stale temporary slots
      .map(s => {
        if (staleScheduleIds.has(s.id)) {
          // Revert stale changes to 'scheduled'
          return {
            ...s,
            status: 'scheduled' as const,
            cancelled_at: null,
            cancel_reason: null,
            rescheduled_to_id: null
          };
        }
        return s;
      });

    setProcessedSchedules(processed);
  }, [schedules]);

  // Filter cancelled and rescheduled classes
  const cancelledClasses = useMemo(() => {
    return processedSchedules.filter(s => s.status === 'cancelled');
  }, [processedSchedules]);

  const rescheduledClasses = useMemo(() => {
    return processedSchedules.filter(s => s.status === 'rescheduled');
  }, [processedSchedules]);

  // Get rescheduled-to schedule info
  const getRescheduledToInfo = (rescheduledToId: string | null | undefined) => {
    if (!rescheduledToId) return null;
    return processedSchedules.find(s => s.id === rescheduledToId);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDay = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  const hasCancelledOrRescheduled = cancelledClasses.length > 0 || rescheduledClasses.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Timetable</h1>
            <p className="text-muted-foreground">Your weekly class schedule</p>
          </div>
          <GoogleCalendarSync schedules={processedSchedules} />
        </div>

        {/* Cancelled & Rescheduled Classes Alert */}
        {hasCancelledOrRescheduled && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                Schedule Changes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cancelled Classes */}
              {cancelledClasses.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2 text-destructive">
                    <XCircle className="w-4 h-4" />
                    Cancelled Classes ({cancelledClasses.length})
                  </h4>
                  <div className="grid gap-2 md:grid-cols-2">
                    {cancelledClasses.map(schedule => (
                      <div
                        key={schedule.id}
                        className="p-3 rounded-lg border border-destructive/20 bg-destructive/5"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <Badge variant="outline" className="text-xs">{schedule.classes?.code}</Badge>
                          <ScheduleStatusBadge status={schedule.status} />
                        </div>
                        <p className="font-medium text-sm">{schedule.classes?.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDay(schedule.day)} • {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                        </p>
                        {schedule.cancel_reason && (
                          <p className="text-xs mt-2 p-2 rounded bg-muted/50">
                            <span className="font-medium">Reason:</span> {schedule.cancel_reason}
                          </p>
                        )}
                        {schedule.cancelled_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Cancelled on {format(new Date(schedule.cancelled_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rescheduled Classes */}
              {rescheduledClasses.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <RefreshCw className="w-4 h-4" />
                    Rescheduled Classes ({rescheduledClasses.length})
                  </h4>
                  <div className="grid gap-2 md:grid-cols-2">
                    {rescheduledClasses.map(schedule => {
                      const newSchedule = getRescheduledToInfo(schedule.rescheduled_to_id);
                      return (
                        <div
                          key={schedule.id}
                          className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5"
                        >
                          <div className="flex items-start justify-between mb-1">
                            <Badge variant="outline" className="text-xs">{schedule.classes?.code}</Badge>
                            <ScheduleStatusBadge status={schedule.status} />
                          </div>
                          <p className="font-medium text-sm">{schedule.classes?.subject}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-muted-foreground line-through">
                              Original: {formatDay(schedule.day)} • {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                            </p>
                            {newSchedule && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                New: {formatDay(newSchedule.day)} • {formatTime(newSchedule.start_time)} - {formatTime(newSchedule.end_time)}
                              </p>
                            )}
                          </div>
                          {schedule.cancel_reason && (
                            <p className="text-xs mt-2 p-2 rounded bg-muted/50">
                              <span className="font-medium">Reason:</span> {schedule.cancel_reason}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Weekly Timetable */}
        <WeeklyTimetable schedules={processedSchedules} isLoading={isLoading} />
      </div>
    </DashboardLayout>
  );
}