import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Calendar, Check, Loader2, Unlink } from 'lucide-react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { ClassSchedule } from '@/hooks/useClassSchedules';

interface GoogleCalendarSyncProps {
  schedules: ClassSchedule[];
}

export function GoogleCalendarSync({ schedules }: GoogleCalendarSyncProps) {
  const { isConnected, isLoading, isSyncing, connect, disconnect, syncSchedules } = useGoogleCalendar();
  const [open, setOpen] = useState(false);

  const handleSync = async () => {
    const formattedSchedules = schedules.map(s => ({
      id: s.id,
      day: s.day,
      start_time: s.start_time,
      end_time: s.end_time,
      classes: {
        subject: s.classes?.subject || '',
        code: s.classes?.code || '',
        room: s.classes?.room || '',
      },
    }));

    await syncSchedules(formattedSchedules);
  };

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="w-4 h-4" />
          {isConnected ? 'Sync Calendar' : 'Connect Calendar'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Google Calendar Sync
          </DialogTitle>
          <DialogDescription>
            {isConnected 
              ? 'Sync your class schedules to Google Calendar with automatic reminders.'
              : 'Connect your Google Calendar to automatically create events for your classes.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {isConnected ? (
            <>
              <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg border border-success/20">
                <Check className="w-5 h-5 text-success" />
                <span className="text-sm font-medium">Google Calendar Connected</span>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {schedules.length} schedule(s) will be synced with:
                </p>
                <ul className="text-sm space-y-1">
                  <li className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-success" />
                    Weekly recurring events
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-success" />
                    30-minute reminder before class
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-success" />
                    10-minute reminder before class
                  </li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleSync} 
                  disabled={isSyncing || schedules.length === 0}
                  className="flex-1"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Sync {schedules.length} Schedule(s)
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={disconnect}>
                  <Unlink className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>By connecting Google Calendar, you can:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Automatically add class events to your calendar</li>
                  <li>• Get reminders before each class</li>
                  <li>• Keep your schedule synchronized</li>
                </ul>
              </div>

              <Button onClick={connect} className="w-full">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                </svg>
                Connect Google Calendar
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
