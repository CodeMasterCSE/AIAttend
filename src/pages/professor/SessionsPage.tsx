import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { QRCodeDisplay } from '@/components/attendance/QRCodeDisplay';
import { LiveAttendanceCard } from '@/components/common/LiveAttendanceCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClasses } from '@/hooks/useClasses';
import { useAttendanceSessions } from '@/hooks/useAttendanceSessions';
import { useAttendanceRecords } from '@/hooks/useAttendanceRecords';
import { useToast } from '@/hooks/use-toast';
import {
  QrCode,
  Play,
  StopCircle,
  Users,
  Clock,
  Loader2,
  MapPin,
} from 'lucide-react';
import { BulkAttendanceMarking } from '@/components/professor/BulkAttendanceMarking';

import { SessionTimer } from '@/components/professor/SessionTimer';
import { ManualAttendanceEditor } from '@/components/professor/ManualAttendanceEditor';
import { SessionConfigDialog } from '@/components/professor/SessionConfigDialog';
import { supabase } from '@/integrations/supabase/client';
import { SessionConfig } from '@/hooks/useAttendanceSessions';

interface SessionLiveCheckinsProps {
  sessionId: string;
}

function SessionLiveCheckins({ sessionId }: SessionLiveCheckinsProps) {
  const { records } = useAttendanceRecords(undefined, sessionId);

  return (
    <LiveAttendanceCard
      className="max-w-4xl mx-auto"
      records={records.map((r) => ({
        id: r.id,
        studentId: r.student_id,
        studentName: r.student?.name,
        studentRollNumber: r.student?.roll_number || undefined,
        studentPhotoUrl: r.student?.photo_url || undefined,
        timestamp: new Date(r.timestamp),
        methodUsed: (r.method_used as 'face' | 'qr' | 'proximity' | 'manual') || 'manual',
        status: r.status === 'present' ? 'present' : 'absent',
      }))}
    />
  );
}

export default function QRSessionsPage() {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('');
  const { classes, isLoading: classesLoading, updateClass, refreshClasses } = useClasses();
  const { sessions, createSession, endSession, refreshSessions } = useAttendanceSessions();
  const { toast } = useToast();

  const activeSession = sessions.find(s => s.is_active && s.class_id === selectedClassId);
  const selectedClass = classes.find(c => c.id === selectedClassId);

  const captureLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        toast({
          title: 'Location not supported',
          description: 'Your browser does not support geolocation. Proximity check-in will use existing class location.',
          variant: 'destructive'
        });
        resolve(null);
        return;
      }

      setLocationStatus('Capturing location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationStatus('');
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          setLocationStatus('');
          console.error('Geolocation error:', error);
          toast({
            title: 'Location access denied',
            description: 'Could not get your location. Proximity check-in will use existing class location.',
          });
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleStartSession = async (config: SessionConfig) => {
    if (!selectedClassId) {
      toast({ title: 'Error', description: 'Please select a class first', variant: 'destructive' });
      return;
    }

    setIsStarting(true);
    try {
      // Capture professor's current location for proximity verification
      const location = await captureLocation();

      if (location) {
        // Update class location with professor's current position
        await updateClass(selectedClassId, {
          latitude: location.latitude,
          longitude: location.longitude,
        });
        toast({
          title: 'Location captured',
          description: 'Classroom location updated for proximity check-in',
        });
      }

      await createSession(selectedClassId, config);
      toast({
        title: 'Session started',
        description: `QR code is now active. Attendance window: ${config.attendanceWindowMinutes} min, Duration: ${config.sessionDurationMinutes} min`
      });
    } catch (error) {
      console.error('Error starting session:', error);
      toast({ title: 'Error', description: 'Failed to start session', variant: 'destructive' });
    } finally {
      setIsStarting(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!selectedClassId) return;

    setIsUpdatingLocation(true);
    try {
      const location = await captureLocation();

      if (location) {
        await updateClass(selectedClassId, {
          latitude: location.latitude,
          longitude: location.longitude,
        });
        await refreshClasses();
        toast({
          title: 'Location updated',
          description: 'New classroom location saved for proximity check-in',
        });
      }
    } catch (error) {
      console.error('Error updating location:', error);
      toast({ title: 'Error', description: 'Failed to update location', variant: 'destructive' });
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;

    try {
      // Automatically mark all other enrolled students as absent for this session
      if (selectedClassId) {
        const { data: enrollments } = await supabase
          .from('class_enrollments')
          .select('student_id')
          .eq('class_id', selectedClassId);

        const { data: existingRecords } = await supabase
          .from('attendance_records')
          .select('student_id')
          .eq('session_id', activeSession.id);

        const presentIds = new Set((existingRecords || []).map((r) => r.student_id));
        const toInsert =
          enrollments
            ?.filter((e) => !presentIds.has(e.student_id))
            .map((e) => ({
              session_id: activeSession.id,
              class_id: selectedClassId,
              student_id: e.student_id,
              status: 'absent',
              method_used: 'manual',
            })) || [];

        if (toInsert.length) {
          await supabase.from('attendance_records').insert(toInsert);
        }
      }

      await endSession(activeSession.id);
      toast({ title: 'Session ended', description: 'Attendance session has been closed. Unmarked students were set as absent.' });
    } catch (error) {
      console.error('Error ending session:', error);
      toast({ title: 'Error', description: 'Failed to end session', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">


        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <QrCode className="w-4 h-4" />
            QR Attendance
          </div>
          <h1 className="text-3xl font-bold mb-2">Generate QR Code</h1>
          <p className="text-muted-foreground">Create a QR code for students to check in</p>
        </div>

        {/* Class Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Class
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={classesLoading ? 'Loading classes...' : 'Select a class'} />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.subject} ({cls.code}) - Room {cls.room}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {classes.length === 0 && !classesLoading && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No classes found. Create a class first to generate QR codes.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Session Control */}
        {selectedClassId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Session Control
                </span>
                {activeSession && (
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                    Active
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!activeSession ? (
                <div className="space-y-3">
                  {locationStatus && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 animate-pulse" />
                      {locationStatus}
                    </div>
                  )}
                  <SessionConfigDialog
                    onStart={handleStartSession}
                    disabled={!selectedClassId}
                    isLoading={isStarting}
                    locationStatus={locationStatus}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    Your location will be captured for proximity check-in
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-green-600 font-medium">
                      Session is active. Students can now scan the QR code below.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Started at {activeSession.start_time} • Window: {activeSession.attendance_window_minutes}min • Duration: {activeSession.session_duration_minutes}min
                    </p>
                    {selectedClass?.latitude && selectedClass?.longitude && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        Location: {selectedClass.latitude.toFixed(6)}, {selectedClass.longitude.toFixed(6)}
                      </p>
                    )}
                  </div>
                  <SessionTimer
                    sessionDate={activeSession.date}
                    sessionStartTime={activeSession.start_time}
                    attendanceWindowMinutes={activeSession.attendance_window_minutes}
                    sessionDurationMinutes={activeSession.session_duration_minutes}
                    isActive={activeSession.is_active}
                    className="mb-4"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <BulkAttendanceMarking
                      classId={selectedClassId}
                      sessionId={activeSession.id}
                      className={`${selectedClass?.subject} (${selectedClass?.code})`}
                      onSuccess={refreshSessions}
                    />
                    <ManualAttendanceEditor
                      classId={selectedClassId}
                      sessionId={activeSession.id}
                      className={`${selectedClass?.subject} (${selectedClass?.code})`}
                      onSuccess={refreshSessions}
                    />
                    <Button
                      onClick={handleUpdateLocation}
                      variant="outline"
                      className="flex-1"
                      disabled={isUpdatingLocation}
                    >
                      {isUpdatingLocation ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <MapPin className="h-4 w-4 mr-2" />
                          Update Location
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleEndSession}
                      variant="destructive"
                      className="flex-1"
                    >
                      <StopCircle className="h-4 w-4 mr-2" />
                      End Session
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* QR Code Display & Live Check-ins */}
        {activeSession && selectedClass && (
          <div className="space-y-6">
            <QRCodeDisplay
              sessionId={activeSession.id}
              className={`${selectedClass.subject} (${selectedClass.code})`}
            />

            <SessionLiveCheckins sessionId={activeSession.id} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
