// Shared attendance validation utilities

export interface AttendanceSession {
  id: string;
  class_id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  attendance_window_minutes: number;
  session_duration_minutes: number;
}

export interface AttendanceWindowResult {
  isOpen: boolean;
  isLate: boolean;
  windowClosedAt: Date | null;
  sessionEndsAt: Date | null;
  remainingWindowSeconds: number;
  remainingSessionSeconds: number;
  error?: string;
}

/**
 * Validates the attendance window for a session
 * All times are calculated in UTC for consistency
 */
export function validateAttendanceWindow(
  session: AttendanceSession,
  currentTime: Date = new Date()
): AttendanceWindowResult {
  // Parse session start time (combine date and time)
  const sessionStartTime = new Date(`${session.date}T${session.start_time}Z`);
  
  // Calculate window end time (attendance_window_minutes after start)
  const windowMinutes = session.attendance_window_minutes ?? 15;
  const windowEndTime = new Date(sessionStartTime.getTime() + windowMinutes * 60 * 1000);
  
  // Calculate session end time
  const sessionDurationMinutes = session.session_duration_minutes ?? 60;
  const sessionEndTime = new Date(sessionStartTime.getTime() + sessionDurationMinutes * 60 * 1000);
  
  const now = currentTime.getTime();
  const windowEndMs = windowEndTime.getTime();
  const sessionEndMs = sessionEndTime.getTime();
  
  // Check if session is still active
  if (!session.is_active) {
    return {
      isOpen: false,
      isLate: false,
      windowClosedAt: windowEndTime,
      sessionEndsAt: sessionEndTime,
      remainingWindowSeconds: 0,
      remainingSessionSeconds: 0,
      error: 'Session has ended',
    };
  }
  
  // Check if session has auto-expired
  if (now > sessionEndMs) {
    return {
      isOpen: false,
      isLate: false,
      windowClosedAt: windowEndTime,
      sessionEndsAt: sessionEndTime,
      remainingWindowSeconds: 0,
      remainingSessionSeconds: 0,
      error: 'Session has expired',
    };
  }
  
  // Check if attendance window is still open
  const isWindowOpen = now <= windowEndMs;
  const remainingWindowSeconds = Math.max(0, Math.floor((windowEndMs - now) / 1000));
  const remainingSessionSeconds = Math.max(0, Math.floor((sessionEndMs - now) / 1000));
  
  // Determine if this would be a late submission (after 10 min but within window)
  const lateThresholdMs = sessionStartTime.getTime() + 10 * 60 * 1000;
  const isLate = now > lateThresholdMs && now <= windowEndMs;
  
  return {
    isOpen: isWindowOpen,
    isLate,
    windowClosedAt: windowEndTime,
    sessionEndsAt: sessionEndTime,
    remainingWindowSeconds,
    remainingSessionSeconds,
    error: isWindowOpen ? undefined : 'Attendance window has closed. Please contact your professor for manual attendance.',
  };
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
