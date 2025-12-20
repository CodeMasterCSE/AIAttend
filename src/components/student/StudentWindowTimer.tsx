import { useAttendanceWindow, formatTimeRemaining } from '@/hooks/useAttendanceWindow';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertTriangle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentWindowTimerProps {
  sessionDate: string;
  sessionStartTime: string;
  attendanceWindowMinutes?: number;
  isActive: boolean;
  className?: string;
}

export function StudentWindowTimer({
  sessionDate,
  sessionStartTime,
  attendanceWindowMinutes = 15,
  isActive,
  className,
}: StudentWindowTimerProps) {
  const windowState = useAttendanceWindow({
    sessionDate,
    sessionStartTime,
    attendanceWindowMinutes,
    isActive,
  });

  if (!isActive) {
    return null;
  }

  const windowProgress = windowState.windowMinutes > 0
    ? ((windowState.windowMinutes * 60 - windowState.remainingWindowSeconds) / (windowState.windowMinutes * 60)) * 100
    : 100;

  const isCritical = windowState.remainingWindowSeconds > 0 && windowState.remainingWindowSeconds <= 60;
  const isWarning = windowState.remainingWindowSeconds > 60 && windowState.remainingWindowSeconds <= 180;

  if (!windowState.isOpen) {
    return (
      <div className={cn(
        "p-4 rounded-xl border bg-destructive/5 border-destructive/20",
        className
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="font-medium text-destructive">Attendance Window Closed</p>
            <p className="text-sm text-muted-foreground">
              Please contact your professor for manual attendance
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "p-4 rounded-xl border",
      isCritical && "bg-destructive/5 border-destructive/20",
      isWarning && "bg-warning/5 border-warning/20",
      !isCritical && !isWarning && "bg-green-500/5 border-green-500/20",
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className={cn(
            "w-4 h-4",
            isCritical && "text-destructive animate-pulse",
            isWarning && "text-warning",
            !isCritical && !isWarning && "text-green-500"
          )} />
          <span className="text-sm font-medium">Time to Check In</span>
        </div>
        <Badge className={cn(
          isCritical && "bg-destructive/10 text-destructive border-destructive/20 animate-pulse",
          isWarning && "bg-warning/10 text-warning border-warning/20",
          !isCritical && !isWarning && "bg-green-500/10 text-green-500 border-green-500/20"
        )}>
          {formatTimeRemaining(windowState.remainingWindowSeconds)}
        </Badge>
      </div>
      <Progress 
        value={windowProgress} 
        className={cn(
          "h-2",
          isCritical && "[&>div]:bg-destructive",
          isWarning && "[&>div]:bg-warning",
          !isCritical && !isWarning && "[&>div]:bg-green-500"
        )}
      />
      {isCritical && (
        <p className="text-xs text-destructive mt-2 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Hurry! Less than a minute remaining
        </p>
      )}
      {windowState.isLate && !isCritical && (
        <p className="text-xs text-warning mt-2 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          You will be marked as late
        </p>
      )}
    </div>
  );
}
