import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ScheduleEvent {
  id: string;
  subject: string;
  classCode: string;
  room: string;
  day: string;
  startTime: string;
  endTime: string;
}

interface GoogleCalendarSyncProps {
  schedules: ScheduleEvent[];
  semesterStartDate?: Date;
  semesterEndDate?: Date;
}

export function GoogleCalendarSync({ 
  schedules, 
  semesterStartDate = new Date(),
  semesterEndDate = new Date(new Date().setMonth(new Date().getMonth() + 4))
}: GoogleCalendarSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedCount, setSyncedCount] = useState(0);

  // Map day names to Google Calendar RRULE day codes
  const dayToRRuleDay: Record<string, string> = {
    'Monday': 'MO',
    'Tuesday': 'TU',
    'Wednesday': 'WE',
    'Thursday': 'TH',
    'Friday': 'FR',
    'Saturday': 'SA',
    'Sunday': 'SU',
  };

  // Get the next occurrence of a specific day
  const getNextDayDate = (dayName: string): Date => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const todayDay = today.getDay();
    const targetDay = days.indexOf(dayName);
    
    let daysUntilTarget = targetDay - todayDay;
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
    }
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);
    return targetDate;
  };

  // Format date for Google Calendar URL
  const formatDateForGCal = (date: Date, time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const eventDate = new Date(date);
    eventDate.setHours(hours, minutes, 0, 0);
    
    return eventDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  // Create Google Calendar event URL
  const createCalendarEventUrl = (schedule: ScheduleEvent): string => {
    const nextOccurrence = getNextDayDate(schedule.day);
    const startDateTime = formatDateForGCal(nextOccurrence, schedule.startTime);
    const endDateTime = formatDateForGCal(nextOccurrence, schedule.endTime);
    
    const endDateFormatted = semesterEndDate.toISOString().split('T')[0].replace(/-/g, '');
    const rruleDay = dayToRRuleDay[schedule.day] || 'MO';
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${schedule.subject} (${schedule.classCode})`,
      dates: `${startDateTime}/${endDateTime}`,
      details: `Class: ${schedule.subject}\nCode: ${schedule.classCode}\nRoom: ${schedule.room}\n\nThis is a recurring class event synced from AttendEase.`,
      location: schedule.room,
      recur: `RRULE:FREQ=WEEKLY;BYDAY=${rruleDay};UNTIL=${endDateFormatted}`,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // Open single event in Google Calendar
  const syncSingleEvent = (schedule: ScheduleEvent) => {
    const url = createCalendarEventUrl(schedule);
    window.open(url, '_blank');
    toast.success(`Opening Google Calendar for ${schedule.subject}`);
  };

  // Generate .ics file for all events
  const generateICSFile = (): string => {
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AttendEase//Class Schedule//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:AttendEase Class Schedule
`;

    schedules.forEach(schedule => {
      const nextOccurrence = getNextDayDate(schedule.day);
      const startDateTime = formatDateForGCal(nextOccurrence, schedule.startTime);
      const endDateTime = formatDateForGCal(nextOccurrence, schedule.endTime);
      const endDateFormatted = semesterEndDate.toISOString().split('T')[0].replace(/-/g, '');
      const rruleDay = dayToRRuleDay[schedule.day] || 'MO';
      const uid = `${schedule.id}@attendease.app`;

      icsContent += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${startDateTime}
DTEND:${endDateTime}
RRULE:FREQ=WEEKLY;BYDAY=${rruleDay};UNTIL=${endDateFormatted}
SUMMARY:${schedule.subject} (${schedule.classCode})
DESCRIPTION:Class: ${schedule.subject}\\nCode: ${schedule.classCode}\\nRoom: ${schedule.room}\\n\\nSynced from AttendEase
LOCATION:${schedule.room}
STATUS:CONFIRMED
END:VEVENT
`;
    });

    icsContent += 'END:VCALENDAR';
    return icsContent;
  };

  // Download ICS file
  const downloadICSFile = () => {
    setIsSyncing(true);
    
    try {
      const icsContent = generateICSFile();
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'attendease-schedule.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSyncedCount(schedules.length);
      toast.success(`Downloaded calendar file with ${schedules.length} events`);
    } catch (error) {
      toast.error('Failed to generate calendar file');
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync all to Google Calendar (opens multiple tabs)
  const syncAllToGoogle = async () => {
    setIsSyncing(true);
    
    for (let i = 0; i < schedules.length; i++) {
      const url = createCalendarEventUrl(schedules[i]);
      window.open(url, '_blank');
      setSyncedCount(i + 1);
      // Small delay between opening tabs
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsSyncing(false);
    toast.success(`Opened ${schedules.length} events in Google Calendar`);
  };

  if (schedules.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/30 text-sm text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span>No schedules to sync. Add class schedules first.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-medium">Google Calendar Sync</h3>
        </div>
        {syncedCount > 0 && (
          <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            {syncedCount} events synced
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Sync your class schedule to Google Calendar. Events will recur weekly until the end of the semester.
      </p>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {schedules.length} classes to sync
        </p>
        <div className="grid gap-2 max-h-48 overflow-y-auto">
          {schedules.map(schedule => (
            <div 
              key={schedule.id}
              className="flex items-center justify-between p-2 rounded-lg bg-background border text-sm"
            >
              <div>
                <span className="font-medium">{schedule.subject}</span>
                <span className="text-muted-foreground ml-2">
                  {schedule.day} {schedule.startTime} - {schedule.endTime}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => syncSingleEvent(schedule)}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={downloadICSFile}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Calendar className="w-4 h-4 mr-2" />
          )}
          Download .ics File
        </Button>
        
        <Button
          type="button"
          onClick={syncAllToGoogle}
          disabled={isSyncing}
          className="bg-[#4285f4] hover:bg-[#3367d6] text-white"
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Syncing ({syncedCount}/{schedules.length})
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.5 22h-15A2.5 2.5 0 0 1 2 19.5v-15A2.5 2.5 0 0 1 4.5 2H9v2H4.5a.5.5 0 0 0-.5.5v15a.5.5 0 0 0 .5.5h15a.5.5 0 0 0 .5-.5V15h2v4.5a2.5 2.5 0 0 1-2.5 2.5z"/>
                <path d="M17 2v2h2.59L11 12.59l1.41 1.41L21 5.41V8h2V2h-6z"/>
              </svg>
              Sync All to Google Calendar
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: Download the .ics file to import all events at once, or sync individually for more control.
      </p>
    </div>
  );
}
