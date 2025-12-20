import { useState, useEffect, useCallback } from 'react';

export interface AttendanceWindowState {
  isOpen: boolean;
  isLate: boolean;
  remainingWindowSeconds: number;
  remainingSessionSeconds: number;
  windowMinutes: number;
  sessionDurationMinutes: number;
  sessionStartTime: Date | null;
}

interface UseAttendanceWindowProps {
  sessionDate?: string;
  sessionStartTime?: string;
  attendanceWindowMinutes?: number;
  sessionDurationMinutes?: number;
  isActive?: boolean;
}

export function useAttendanceWindow({
  sessionDate,
  sessionStartTime,
  attendanceWindowMinutes = 15,
  sessionDurationMinutes = 60,
  isActive = false,
}: UseAttendanceWindowProps): AttendanceWindowState {
  const [state, setState] = useState<AttendanceWindowState>({
    isOpen: false,
    isLate: false,
    remainingWindowSeconds: 0,
    remainingSessionSeconds: 0,
    windowMinutes: attendanceWindowMinutes,
    sessionDurationMinutes: sessionDurationMinutes,
    sessionStartTime: null,
  });

  const calculateState = useCallback(() => {
    if (!sessionDate || !sessionStartTime || !isActive) {
      return {
        isOpen: false,
        isLate: false,
        remainingWindowSeconds: 0,
        remainingSessionSeconds: 0,
        windowMinutes: attendanceWindowMinutes,
        sessionDurationMinutes: sessionDurationMinutes,
        sessionStartTime: null,
      };
    }

    const startTime = new Date(`${sessionDate}T${sessionStartTime}`);
    const now = new Date();
    
    const windowEndTime = new Date(startTime.getTime() + attendanceWindowMinutes * 60 * 1000);
    const sessionEndTime = new Date(startTime.getTime() + sessionDurationMinutes * 60 * 1000);
    
    const nowMs = now.getTime();
    const windowEndMs = windowEndTime.getTime();
    const sessionEndMs = sessionEndTime.getTime();
    
    const isWindowOpen = nowMs <= windowEndMs && isActive;
    const lateThresholdMs = startTime.getTime() + 10 * 60 * 1000;
    const isLate = nowMs > lateThresholdMs && nowMs <= windowEndMs;
    
    const remainingWindowSeconds = Math.max(0, Math.floor((windowEndMs - nowMs) / 1000));
    const remainingSessionSeconds = Math.max(0, Math.floor((sessionEndMs - nowMs) / 1000));

    return {
      isOpen: isWindowOpen,
      isLate,
      remainingWindowSeconds,
      remainingSessionSeconds,
      windowMinutes: attendanceWindowMinutes,
      sessionDurationMinutes: sessionDurationMinutes,
      sessionStartTime: startTime,
    };
  }, [sessionDate, sessionStartTime, attendanceWindowMinutes, sessionDurationMinutes, isActive]);

  useEffect(() => {
    setState(calculateState());
    
    if (!isActive) return;

    const interval = setInterval(() => {
      setState(calculateState());
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateState, isActive]);

  return state;
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
