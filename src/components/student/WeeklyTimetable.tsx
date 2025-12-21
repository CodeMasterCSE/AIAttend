import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { ClassSchedule } from '@/hooks/useClassSchedules';

interface WeeklyTimetableProps {
  schedules: ClassSchedule[];
  isLoading?: boolean;
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

export function WeeklyTimetable({ schedules, isLoading }: WeeklyTimetableProps) {
  const schedulesByDay = useMemo(() => {
    const grouped: Record<string, ClassSchedule[]> = {};
    DAYS.forEach(day => {
      grouped[day] = schedules.filter(s => s.day.toLowerCase() === day);
    });
    return grouped;
  }, [schedules]);

  const classColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const uniqueClasses = [...new Set(schedules.map(s => s.class_id))];
    uniqueClasses.forEach((classId, index) => {
      map[classId] = COLORS[index % COLORS.length];
    });
    return map;
  }, [schedules]);

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
            <div className="grid grid-cols-[100px_repeat(10,1fr)] gap-2 mb-4">
              <div className="flex items-center justify-center text-xs font-medium text-muted-foreground p-2 bg-muted/5 rounded-lg">
                Day / Time
              </div>
              {TIME_SLOTS.map(timeSlot => (
                <div
                  key={timeSlot}
                  className="text-center p-2 rounded-lg text-xs font-medium text-muted-foreground bg-muted/50 flex items-center justify-center"
                >
                  {formatTime(timeSlot)}
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="space-y-2">
              {DAYS.map(day => (
                <div key={day} className="grid grid-cols-[100px_repeat(10,1fr)] gap-2 min-h-[100px]">
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
                          <div key={`${day}-${timeSlot}`} className="flex items-center justify-center rounded-lg bg-muted/30 border border-dashed border-muted p-1">
                            <span className="text-xs font-medium text-muted-foreground/70 rotate-0">
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

                        // Just render the single schedule card for this slot
                        cells.push(
                          <div
                            key={`${day}-${timeSlot}`}
                            style={{ gridColumn: `span ${span}` }}
                            className="relative border rounded-lg border-dashed border-border/50 bg-card/50 p-1"
                          >
                            <div
                              key={startingSchedule.id}
                              className={`w-full h-full rounded-md border p-2 text-xs flex flex-col justify-between cursor-pointer hover:opacity-90 transition-opacity ${classColorMap[startingSchedule.class_id]
                                }`}
                            >
                              <div>
                                <div className="font-semibold truncate leading-tight">
                                  {startingSchedule.classes?.code}
                                </div>
                                <div className="text-[10px] opacity-80 truncate leading-tight">
                                  {startingSchedule.classes?.subject}
                                </div>
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1 text-[10px] opacity-70">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(startingSchedule.start_time)} - {formatTime(startingSchedule.end_time)}
                                </div>
                                {startingSchedule.classes?.room && (
                                  <div className="flex items-center gap-1 text-[10px] opacity-70">
                                    <MapPin className="w-3 h-3" />
                                    {startingSchedule.classes.room}
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

        {schedules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No classes scheduled</p>
            <p className="text-sm">Your timetable will appear here once classes are scheduled</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
