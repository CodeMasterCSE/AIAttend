import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Calendar, Clock, MapPin, XCircle, CalendarClock, BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ScheduleStatusBadge } from '@/components/common/ScheduleStatusBadge';

interface ScheduleItem {
  id: string;
  class_id: string;
  day: string;
  start_time: string;
  end_time: string;
  status?: 'scheduled' | 'cancelled' | 'rescheduled';
  classes?: {
    id?: string;
    subject: string;
    code: string;
    room: string;
    department?: string;
  };
}

interface WeeklyTimetableProps {
  schedules: ScheduleItem[];
  isLoading?: boolean;
  showCancelledSchedules?: boolean;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
};

const TIME_SLOTS = [
  '10:00', '10:50', '11:40', '12:30',
  '13:00', '13:50', '14:40', '15:30', '16:20', '17:10'
];

const COLORS = [
  'bg-primary/20 border-primary/40 text-primary',
  'bg-accent/20 border-accent/40 text-accent',
  'bg-success/20 border-success/40 text-success',
  'bg-warning/20 border-warning/40 text-warning-foreground',
  'bg-destructive/20 border-destructive/40 text-destructive',
];

export function WeeklyTimetable({ schedules, isLoading, showCancelledSchedules = false }: WeeklyTimetableProps) {
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);

  // Filter schedules based on status - NOW SHOWING ALL
  const activeSchedules = useMemo(() => {
    return schedules;
  }, [schedules]);

  const schedulesByDay = useMemo(() => {
    const grouped: Record<string, ScheduleItem[]> = {};
    DAYS.forEach(day => {
      grouped[day] = activeSchedules.filter(s => s.day.toLowerCase() === day);
    });
    return grouped;
  }, [activeSchedules]);

  const classColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const uniqueClasses = [...new Set(activeSchedules.map(s => s.class_id))];
    uniqueClasses.forEach((classId, index) => {
      map[classId] = COLORS[index % COLORS.length];
    });
    return map;
  }, [activeSchedules]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const getCurrentDay = () => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  };

  const currentDay = getCurrentDay();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Weekly Timetable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Loading timetable...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Weekly Timetable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="min-w-[1000px] pb-4">
              {/* Header */}
              <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: '80px repeat(10, minmax(0, 1fr))' }}>
                <div className="flex items-center justify-center text-xs font-medium text-muted-foreground p-2 bg-muted/5 rounded-lg">
                  Day / Time
                </div>
                {TIME_SLOTS.map(timeSlot => (
                  <div
                    key={timeSlot}
                    className="text-center p-2 rounded-lg text-xs font-medium text-muted-foreground bg-muted/50 flex items-center justify-center min-w-0"
                  >
                    {formatTime(timeSlot)}
                  </div>
                ))}
              </div>

              {/* Time Grid */}
              <div className="space-y-2">
                {DAYS.map(day => (
                  <div key={day} className="grid gap-2 min-h-[100px]" style={{ gridTemplateColumns: '80px repeat(10, minmax(0, 1fr))' }}>
                    {/* Day Label */}
                    <div
                      className={`flex items-center justify-center p-2 rounded-lg text-sm font-medium ${currentDay === day
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50'
                        }`}
                    >
                      {DAY_LABELS[day]}
                    </div>

                    {/* Time Slots */}
                    {(() => {
                      const cells = [];
                      let skipCount = 0;

                      for (let i = 0; i < TIME_SLOTS.length; i++) {
                        if (skipCount > 0) {
                          skipCount--;
                          continue;
                        }

                        const timeSlot = TIME_SLOTS[i];

                        // Handle Break Slot
                        if (timeSlot === '12:30') {
                          cells.push(
                            <div key={`${day}-${timeSlot}`} className="flex items-center justify-center rounded-lg bg-amber-100/50 dark:bg-amber-900/10 border border-dashed border-amber-200 dark:border-amber-800 p-1">
                              <span className="text-xs font-medium text-amber-700 dark:text-amber-400 rotate-0">
                                Break
                              </span>
                            </div>
                          );
                          continue;
                        }

                        // Find schedule starting at this slot
                        const daySchedules = schedulesByDay[day] || [];
                        const startingSchedule = daySchedules.find(s => {
                          const scheduleMinutes = getMinutes(s.start_time);
                          const slotMinutes = getMinutes(timeSlot);
                          return Math.abs(scheduleMinutes - slotMinutes) < 10;
                        });

                        if (startingSchedule) {
                          const duration = getMinutes(startingSchedule.end_time) - getMinutes(startingSchedule.start_time);
                          const span = Math.max(1, Math.ceil(duration / 50));
                          const isCancelled = startingSchedule.status === 'cancelled';
                          const isRescheduled = startingSchedule.status === 'rescheduled';

                          // Just render the single schedule card for this slot
                          cells.push(
                            <div
                              key={`${day}-${timeSlot}`}
                              style={{ gridColumn: `span ${span}` }}
                              className="relative border rounded-lg border-dashed border-border/50 bg-card/50 p-1 min-w-0 overflow-hidden"
                            >
                              <div
                                key={startingSchedule.id}
                                onClick={() => setSelectedSchedule(startingSchedule)}
                                className={`w-full h-full rounded-md border p-2 text-xs flex flex-col justify-between cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all overflow-hidden ${isCancelled
                                  ? 'bg-destructive/10 border-destructive/30 text-destructive opacity-60'
                                  : isRescheduled
                                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 opacity-60'
                                    : classColorMap[startingSchedule.class_id]
                                  }`}
                              >
                                <div className="min-w-0 overflow-hidden">
                                  <div className="font-semibold truncate leading-tight flex items-center gap-1">
                                    {isCancelled && <XCircle className="w-3 h-3 flex-shrink-0" />}
                                    {isRescheduled && <CalendarClock className="w-3 h-3 flex-shrink-0" />}
                                    <span className={`truncate ${isCancelled || isRescheduled ? 'line-through' : ''}`}>
                                      {startingSchedule.classes?.code}
                                    </span>
                                  </div>
                                  <div className={`text-[10px] opacity-80 truncate leading-tight ${isCancelled || isRescheduled ? 'line-through' : ''}`}>
                                    {startingSchedule.classes?.subject}
                                  </div>
                                  {(isCancelled || isRescheduled) && (
                                    <ScheduleStatusBadge
                                      status={startingSchedule.status!}
                                      showIcon={false}
                                      className="mt-1 text-[9px] px-1 py-0"
                                    />
                                  )}
                                </div>
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-1 text-[10px] opacity-70 truncate">
                                    <Clock className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{formatTime(startingSchedule.start_time)} - {formatTime(startingSchedule.end_time)}</span>
                                  </div>
                                  {startingSchedule.classes?.room && (
                                    <div className="flex items-center gap-1 text-[10px] opacity-70 truncate">
                                      <MapPin className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{startingSchedule.classes.room}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );

                          skipCount = span - 1;
                        } else {
                          // Empty slot
                          cells.push(
                            <div key={`${day}-${timeSlot}`} className="relative border rounded-lg border-dashed border-border/50 bg-card/50 p-1 opacity-50"></div>
                          );
                        }
                      }
                      return cells;
                    })()}
                  </div>
                ))}
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {activeSchedules.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No classes scheduled</p>
              <p className="text-sm">Your timetable will appear here once classes are scheduled</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedSchedule} onOpenChange={() => setSelectedSchedule(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Class Details
            </DialogTitle>
            <DialogDescription>
              {selectedSchedule?.day && DAY_LABELS[selectedSchedule.day]} • {selectedSchedule && formatTime(selectedSchedule.start_time)} - {selectedSchedule && formatTime(selectedSchedule.end_time)}
            </DialogDescription>
          </DialogHeader>

          {selectedSchedule && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedSchedule.classes?.subject}</h3>
                    <p className="text-muted-foreground text-sm">{selectedSchedule.classes?.code}</p>
                  </div>
                  {selectedSchedule.status && selectedSchedule.status !== 'scheduled' && (
                    <ScheduleStatusBadge status={selectedSchedule.status} />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{formatTime(selectedSchedule.start_time)} - {formatTime(selectedSchedule.end_time)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>Room: {selectedSchedule.classes?.room}</span>
                  </div>
                  {selectedSchedule.classes?.department && (
                    <div className="flex items-center gap-2 col-span-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>Department: {selectedSchedule.classes?.department}</span>
                    </div>
                  )}
                </div>
              </div>

              {(selectedSchedule.status === 'cancelled' || selectedSchedule.status === 'rescheduled') && selectedSchedule['cancel_reason' as keyof ScheduleItem] && (
                <div className="text-sm p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <span className="font-semibold block mb-1">Reason for change:</span>
                  {selectedSchedule['cancel_reason' as keyof ScheduleItem]}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
