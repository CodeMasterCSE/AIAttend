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

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
};

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
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
          <div className="min-w-[700px]">
            {/* Header */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              <div className="text-xs font-medium text-muted-foreground p-2">Time</div>
              {DAYS.map(day => (
                <div
                  key={day}
                  className={`text-center p-2 rounded-lg text-sm font-medium ${
                    currentDay === day
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50'
                  }`}
                >
                  {DAY_LABELS[day]}
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="space-y-1">
              {TIME_SLOTS.map(timeSlot => (
                <div key={timeSlot} className="grid grid-cols-7 gap-2 min-h-[60px]">
                  <div className="text-xs text-muted-foreground p-2 pt-0">
                    {formatTime(timeSlot)}
                  </div>
                  {DAYS.map(day => {
                    const daySchedules = schedulesByDay[day].filter(s => {
                      const startHour = parseInt(s.start_time.split(':')[0]);
                      const slotHour = parseInt(timeSlot.split(':')[0]);
                      return startHour === slotHour;
                    });

                    return (
                      <div key={`${day}-${timeSlot}`} className="relative">
                        {daySchedules.map(schedule => (
                          <div
                            key={schedule.id}
                            className={`absolute inset-x-0 rounded-lg border p-2 text-xs ${
                              classColorMap[schedule.class_id]
                            }`}
                            style={{
                              minHeight: '56px',
                            }}
                          >
                            <div className="font-semibold truncate">
                              {schedule.classes?.code}
                            </div>
                            <div className="text-[10px] opacity-80 truncate">
                              {schedule.classes?.subject}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] opacity-70 mt-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(schedule.start_time)}
                            </div>
                            {schedule.classes?.room && (
                              <div className="flex items-center gap-1 text-[10px] opacity-70">
                                <MapPin className="w-3 h-3" />
                                {schedule.classes.room}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
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
