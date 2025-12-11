import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Play, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ScheduledClass {
  scheduleId: string;
  classId: string;
  subject: string;
  code: string;
  room: string;
  startTime: string;
  endTime: string;
  hasActiveSession: boolean;
}

interface ScheduledSessionStarterProps {
  onSessionStarted: () => void;
}

export function ScheduledSessionStarter({ onSessionStarted }: ScheduledSessionStarterProps) {
  const { user } = useAuth();
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startingSession, setStartingSession] = useState<string | null>(null);

  useEffect(() => {
    const fetchTodaySchedules = async () => {
      if (!user) return;

      try {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = days[new Date().getDay()];

        // Get professor's classes
        const { data: classes, error: classError } = await supabase
          .from('classes')
          .select('id, subject, code, room')
          .eq('professor_id', user.id);

        if (classError) throw classError;
        if (!classes || classes.length === 0) {
          setScheduledClasses([]);
          setIsLoading(false);
          return;
        }

        const classIds = classes.map(c => c.id);

        // Get today's schedules
        const { data: schedules, error: scheduleError } = await supabase
          .from('class_schedules')
          .select('id, class_id, start_time, end_time')
          .in('class_id', classIds)
          .eq('day', today)
          .order('start_time');

        if (scheduleError) throw scheduleError;

        // Get active sessions for today
        const { data: activeSessions, error: sessionError } = await supabase
          .from('attendance_sessions')
          .select('class_id')
          .in('class_id', classIds)
          .eq('is_active', true);

        if (sessionError) throw sessionError;

        const activeClassIds = new Set(activeSessions?.map(s => s.class_id) || []);

        const scheduledList: ScheduledClass[] = (schedules || []).map(schedule => {
          const classInfo = classes.find(c => c.id === schedule.class_id);
          return {
            scheduleId: schedule.id,
            classId: schedule.class_id,
            subject: classInfo?.subject || 'Unknown',
            code: classInfo?.code || '',
            room: classInfo?.room || '',
            startTime: schedule.start_time,
            endTime: schedule.end_time,
            hasActiveSession: activeClassIds.has(schedule.class_id),
          };
        });

        setScheduledClasses(scheduledList);
      } catch (error) {
        console.error('Error fetching schedules:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTodaySchedules();
  }, [user]);

  const handleStartSession = async (classId: string) => {
    setStartingSession(classId);
    try {
      // Capture location
      let location: { latitude: number; longitude: number } | null = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            });
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        } catch (e) {
          console.log('Location not available');
        }
      }

      // Update class location if captured
      if (location) {
        await supabase
          .from('classes')
          .update({ latitude: location.latitude, longitude: location.longitude })
          .eq('id', classId);
      }

      // Create session
      const now = new Date();
      const startTime = now.toTimeString().slice(0, 8);

      const { error } = await supabase
        .from('attendance_sessions')
        .insert({
          class_id: classId,
          start_time: startTime,
          is_active: true,
        });

      if (error) throw error;

      toast.success('Session started successfully');
      onSessionStarted();

      // Update local state
      setScheduledClasses(prev =>
        prev.map(c => (c.classId === classId ? { ...c, hasActiveSession: true } : c))
      );
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Failed to start session');
    } finally {
      setStartingSession(null);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const isCurrentTime = (startTime: string, endTime: string) => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    return currentTime >= startTime.slice(0, 5) && currentTime <= endTime.slice(0, 5);
  };

  if (isLoading) {
    return null;
  }

  if (scheduledClasses.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="w-5 h-5" />
          Today's Scheduled Classes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {scheduledClasses.map(schedule => {
            const isCurrent = isCurrentTime(schedule.startTime, schedule.endTime);
            return (
              <div
                key={schedule.scheduleId}
                className={`p-4 rounded-xl border ${
                  isCurrent ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline">{schedule.code}</Badge>
                  {isCurrent && (
                    <Badge className="bg-primary/20 text-primary border-primary/30">Now</Badge>
                  )}
                </div>
                <h4 className="font-medium mb-1">{schedule.subject}</h4>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {schedule.room}
                  </span>
                </div>
                {schedule.hasActiveSession ? (
                  <Badge className="w-full justify-center bg-success/20 text-success border-success/30">
                    Session Active
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleStartSession(schedule.classId)}
                    disabled={startingSession === schedule.classId}
                  >
                    {startingSession === schedule.classId ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Start Session
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
