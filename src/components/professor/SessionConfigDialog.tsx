import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Play, Clock, Timer, Loader2 } from 'lucide-react';
import { SessionConfig } from '@/hooks/useAttendanceSessions';

interface SessionConfigDialogProps {
  onStart: (config: SessionConfig) => Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  locationStatus?: string;
}

export function SessionConfigDialog({
  onStart,
  disabled,
  isLoading,
  locationStatus,
}: SessionConfigDialogProps) {
  const [open, setOpen] = useState(false);
  const [attendanceWindowMinutes, setAttendanceWindowMinutes] = useState(15);
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState(60);
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await onStart({
        attendanceWindowMinutes,
        sessionDurationMinutes,
      });
      setOpen(false);
    } finally {
      setIsStarting(false);
    }
  };

  const windowPresets = [5, 10, 15, 20, 30];
  const durationPresets = [30, 45, 60, 90, 120];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled || isLoading} className="w-full" size="lg">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {locationStatus || 'Starting...'}
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Start Attendance Session
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Session</DialogTitle>
          <DialogDescription>
            Set the attendance window and session duration before starting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Attendance Window */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-primary" />
                Attendance Window
              </Label>
              <span className="text-sm font-medium text-primary">
                {attendanceWindowMinutes} min
              </span>
            </div>
            <Slider
              value={[attendanceWindowMinutes]}
              onValueChange={([value]) => setAttendanceWindowMinutes(value)}
              min={5}
              max={60}
              step={5}
              className="w-full"
            />
            <div className="flex gap-2 flex-wrap">
              {windowPresets.map((preset) => (
                <Button
                  key={preset}
                  variant={attendanceWindowMinutes === preset ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAttendanceWindowMinutes(preset)}
                >
                  {preset}m
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Students can check in during this time window from session start.
            </p>
          </div>

          {/* Session Duration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Session Duration
              </Label>
              <span className="text-sm font-medium text-primary">
                {sessionDurationMinutes} min
              </span>
            </div>
            <Slider
              value={[sessionDurationMinutes]}
              onValueChange={([value]) => setSessionDurationMinutes(value)}
              min={15}
              max={180}
              step={15}
              className="w-full"
            />
            <div className="flex gap-2 flex-wrap">
              {durationPresets.map((preset) => (
                <Button
                  key={preset}
                  variant={sessionDurationMinutes === preset ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSessionDurationMinutes(preset)}
                >
                  {preset}m
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Total class duration. Session auto-ends after this time.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={isStarting}>
            {isStarting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
