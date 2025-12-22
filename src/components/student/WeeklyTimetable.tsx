import { useMemo, type CSSProperties } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { ClassSchedule } from '@/hooks/useClassSchedules';

interface WeeklyTimetableProps {
  schedules: ClassSchedule[];
  isLoading?: boolean;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
};

const COLORS = [
  'bg-primary/20 border-primary/40 text-primary',
  'bg-accent/20 border-accent/40 text-accent',
  'bg-success/20 border-success/40 text-success',
  'bg-warning/20 border-warning/40 text-warning-foreground',
  'bg-destructive/20 border-destructive/40 text-destructive',
];

export function WeeklyTimetable({ schedules, isLoading }: WeeklyTimetableProps) {
  const getMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const timeSlots = useMemo(() => {
    // Default academic window, but expand if schedules fall outside.
    const DEFAULT_START = 8 * 60; // 08:00
    const DEFAULT_END = 18 * 60; // 18:00
    const STEP = 30; // minutes

    const scheduleStarts = schedules.map((s) => getMinutes(s.start_time));
    const scheduleEnds = schedules.map((s) => getMinutes(s.end_time));

    const minStart = scheduleStarts.length ? Math.min(...scheduleStarts) : DEFAULT_START;
    const maxEnd = scheduleEnds.length ? Math.max(...scheduleEnds) : DEFAULT_END;

    const start = Math.max(6 * 60, Math.floor(Math.min(DEFAULT_START, minStart) / STEP) * STEP);
    const end = Math.min(22 * 60, Math.ceil(Math.max(DEFAULT_END, maxEnd) / STEP) * STEP);

    const slots: string[] = [];
    for (let mins = start; mins < end; mins += STEP) {
      const h = String(Math.floor(mins / 60)).padStart(2, '0');
      const m = String(mins % 60).padStart(2, '0');
      slots.push(`${h}:${m}`);
    }
    return slots;
  }, [schedules]);

  const schedulesByDay = useMemo(() => {
    const grouped: Record<string, ClassSchedule[]> = {};
    DAYS.forEach((day) => {
      grouped[day] = schedules
        .filter((s) => (s.day || '').toLowerCase() === day)
        .sort((a, b) => getMinutes(a.start_time) - getMinutes(b.start_time));
    });
    return grouped;
  }, [schedules]);

  const classColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const uniqueClasses = [...new Set(schedules.map((s) => s.class_id))];
    uniqueClasses.forEach((classId, index) => {
      map[classId] = COLORS[index % COLORS.length];
    });
    return map;
  }, [schedules]);

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

  const gridColumnsStyle: React.CSSProperties = {
    gridTemplateColumns: `100px repeat(${timeSlots.length}, minmax(0, 1fr))`,
  };

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
            <div className="grid gap-2 mb-4" style={gridColumnsStyle}>
              <div className="flex items-center justify-center text-xs font-medium text-muted-foreground p-2 bg-muted/5 rounded-lg">
                Day / Time
              </div>
              {timeSlots.map((timeSlot) => (
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
              {DAYS.map((day) => (
                <div key={day} className="grid gap-2 min-h-[100px]" style={gridColumnsStyle}>
                  {/* Day Label */}
                  <div
                    className={`flex items-center justify-center p-2 rounded-lg text-sm font-medium ${
                      currentDay === day ? 'bg-primary text-primary-foreground' : 'bg-muted/50'
                    }`}
                  >
                    {DAY_LABELS[day]}
                  </div>

                  {/* Time Slots */}
                  {(() => {
                    const cells = [];
                    let skipCount = 0;

                    for (let i = 0; i < timeSlots.length; i++) {
                      if (skipCount > 0) {
                        skipCount--;
                        continue;
                      }

                      const timeSlot = timeSlots[i];

                      // Optional lunch break marker
                      if (timeSlot === '12:30') {
                        cells.push(
                          <div
                            key={`${day}-${timeSlot}`}
                            className="flex items-center justify-center rounded-lg bg-muted/30 border border-dashed border-muted p-1"
                          >
                            <span className="text-xs font-medium text-muted-foreground/70">Break</span>
                          </div>
                        );
                        continue;
                      }

                      const daySchedules = schedulesByDay[day] || [];
                      const startingSchedule = daySchedules.find((s) => {
                        const scheduleMinutes = getMinutes(s.start_time);
                        const slotMinutes = getMinutes(timeSlot);
                        return Math.abs(scheduleMinutes - slotMinutes) <= 5;
                      });

                      if (startingSchedule) {
                        const duration =
                          getMinutes(startingSchedule.end_time) - getMinutes(startingSchedule.start_time);
                        const span = Math.max(1, Math.ceil(duration / 30));

                        cells.push(
                          <div
                            key={`${day}-${timeSlot}`}
                            style={{ gridColumn: `span ${span}` }}
                            className="relative border rounded-lg border-dashed border-border/50 bg-card/50 p-1"
                          >
                            <div
                              key={startingSchedule.id}
                              className={`w-full h-full rounded-md border p-2 text-xs flex flex-col justify-between cursor-pointer hover:opacity-90 transition-opacity ${
                                classColorMap[startingSchedule.class_id]
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
                        cells.push(
                          <div
                            key={`${day}-${timeSlot}`}
                            className="relative border rounded-lg border-dashed border-border/50 bg-card/50 p-1 opacity-50"
                          />
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
