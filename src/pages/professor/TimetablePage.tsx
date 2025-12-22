import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WeeklyTimetable } from '@/components/student/WeeklyTimetable';
import { GoogleCalendarSync } from '@/components/calendar/GoogleCalendarSync';
import { useProfessorSchedules, ProfessorSchedule } from '@/hooks/useProfessorSchedules';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Clock, MapPin } from 'lucide-react';

export default function ProfessorTimetablePage() {
  const { schedules, isLoading } = useProfessorSchedules();
  const [processedSchedules, setProcessedSchedules] = useState<ProfessorSchedule[]>([]);

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

  // Count unique classes (from all processed schedules to be safe, or original schedules if we want total catalog)
  // Using original schedules is fine for "Classes" count as it represents the course load catalog.
  const uniqueClasses = [...new Set(schedules.map(s => s.class_id))].length;

  // Filter for active (non-cancelled) sessions for workload calculations based on EFFECTIVE schedule
  const activeSchedules = processedSchedules.filter(s => s.status !== 'cancelled');

  // Calculate total active hours per week
  const totalHours = activeSchedules.reduce((acc, s) => {
    const [startH, startM] = s.start_time.split(':').map(Number);
    const [endH, endM] = s.end_time.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return acc + (endMinutes - startMinutes);
  }, 0) / 60;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Timetable</h1>
            <p className="text-muted-foreground">View your weekly teaching schedule</p>
          </div>
          <GoogleCalendarSync schedules={processedSchedules as any} />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{uniqueClasses}</p>
                  <p className="text-sm text-muted-foreground">Classes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Number.isInteger(totalHours) ? totalHours : totalHours.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Hours/Week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2 md:col-span-1">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <MapPin className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeSchedules.length}</p>
                  <p className="text-sm text-muted-foreground">Sessions/Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timetable */}
        <WeeklyTimetable schedules={processedSchedules} isLoading={isLoading} />
      </div>
    </DashboardLayout>
  );
}
