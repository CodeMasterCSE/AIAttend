import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Timer, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAttendanceWindow, formatTimeRemaining } from '@/hooks/useAttendanceWindow';
import { cn } from '@/lib/utils';

interface SessionTimerProps {
  sessionDate: string;
  sessionStartTime: string;
  attendanceWindowMinutes?: number;
  sessionDurationMinutes?: number;
  isActive: boolean;
  className?: string;
}

export function SessionTimer({
  sessionDate,
  sessionStartTime,
  attendanceWindowMinutes = 15,
  sessionDurationMinutes = 60,
  isActive,
  className,
}: SessionTimerProps) {
  const windowState = useAttendanceWindow({
    sessionDate,
    sessionStartTime,
    attendanceWindowMinutes,
    sessionDurationMinutes,
    isActive,
  });

  if (!isActive) {
    return null;
  }

  const windowProgress = windowState.windowMinutes > 0
    ? ((windowState.windowMinutes * 60 - windowState.remainingWindowSeconds) / (windowState.windowMinutes * 60)) * 100
    : 100;

  const sessionProgress = windowState.sessionDurationMinutes > 0
    ? ((windowState.sessionDurationMinutes * 60 - windowState.remainingSessionSeconds) / (windowState.sessionDurationMinutes * 60)) * 100
    : 100;

  const isWindowCritical = windowState.remainingWindowSeconds > 0 && windowState.remainingWindowSeconds <= 60;
  const isWindowWarning = windowState.remainingWindowSeconds > 60 && windowState.remainingWindowSeconds <= 180;

  return (
    <Card className={cn("border-primary/20", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Timer className="h-5 w-5" />
          Session Timers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Attendance Window Timer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Attendance Window</span>
            </div>
            {windowState.isOpen ? (
              <Badge 
                className={cn(
                  isWindowCritical && "bg-destructive/10 text-destructive border-destructive/20 animate-pulse",
                  isWindowWarning && "bg-warning/10 text-warning border-warning/20",
                  !isWindowCritical && !isWindowWarning && "bg-green-500/10 text-green-500 border-green-500/20"
                )}
              >
                {formatTimeRemaining(windowState.remainingWindowSeconds)} remaining
              </Badge>
            ) : (
              <Badge className="bg-muted text-muted-foreground">
                Closed
              </Badge>
            )}
          </div>
          <Progress 
            value={windowProgress} 
            className={cn(
              "h-2",
              isWindowCritical && "[&>div]:bg-destructive",
              isWindowWarning && "[&>div]:bg-warning",
              !isWindowCritical && !isWindowWarning && "[&>div]:bg-green-500"
            )}
          />
          {!windowState.isOpen && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Students cannot self-check-in after the window closes
            </p>
          )}
        </div>

        {/* Session Duration Timer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Session Duration</span>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {formatTimeRemaining(windowState.remainingSessionSeconds)} remaining
            </Badge>
          </div>
          <Progress 
            value={sessionProgress} 
            className="h-2 [&>div]:bg-primary"
          />
        </div>

        {/* Status Summary */}
        <div className={cn(
          "p-3 rounded-lg text-sm",
          windowState.isOpen 
            ? "bg-green-500/10 text-green-700 dark:text-green-400" 
            : "bg-muted text-muted-foreground"
        )}>
          {windowState.isOpen ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Students can mark attendance using Face, QR, or Proximity</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Use manual attendance to mark late arrivals or handle edge cases</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
