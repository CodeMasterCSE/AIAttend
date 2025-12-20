import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { QRScanner } from '@/components/attendance/QRScanner';
import { FaceCheckIn } from '@/components/attendance/FaceCheckIn';
import { ProximityCheckIn } from '@/components/attendance/ProximityCheckIn';
import { ActiveSessionsCard } from '@/components/student/ActiveSessionsCard';
import { StudentWindowTimer } from '@/components/student/StudentWindowTimer';
import { 
  ScanFace, 
  QrCode, 
  MapPin, 
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type CheckInMethod = 'face' | 'qr' | 'proximity';
type CheckInStatus = 'idle' | 'scanning' | 'processing' | 'success' | 'error';

interface SelectedClass {
  subject: string;
  code: string;
  room: string;
  sessionId: string;
  classId: string;
  sessionDate: string;
  sessionStartTime: string;
  attendanceWindowMinutes: number;
}

export default function CheckInPage() {
  const [selectedMethod, setSelectedMethod] = useState<CheckInMethod>('face');
  const [status, setStatus] = useState<CheckInStatus>('idle');
  const [selectedClass, setSelectedClass] = useState<SelectedClass | null>(null);
  const { toast } = useToast();

  const handleSelectSession = (
    sessionId: string, 
    classInfo: { 
      subject: string; 
      code: string; 
      room: string; 
      classId: string;
      sessionDate: string;
      sessionStartTime: string;
      attendanceWindowMinutes: number;
    }
  ) => {
    setSelectedClass({ ...classInfo, sessionId });
    setSelectedMethod('face');
    setStatus('idle');
  };

  const resetCheckIn = () => {
    setStatus('idle');
  };

  const methods = [
    { 
      id: 'face' as CheckInMethod, 
      icon: ScanFace, 
      label: 'Face Recognition',
      description: 'Recommended - Quick & secure',
    },
    { 
      id: 'qr' as CheckInMethod, 
      icon: QrCode, 
      label: 'QR Code',
      description: 'Backup method',
    },
    { 
      id: 'proximity' as CheckInMethod, 
      icon: MapPin, 
      label: 'GPS Proximity',
      description: 'Location-based verification',
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            AI-Powered Verification
          </div>
          <h1 className="text-3xl font-bold mb-2">Quick Check-in</h1>
          <p className="text-muted-foreground">Choose your preferred method to mark attendance</p>
        </div>

        {/* Active Sessions - Real-time */}
        <ActiveSessionsCard onSelectSession={handleSelectSession} />

        {/* Selected Class Info */}
        {selectedClass && (
          <div className="space-y-4">
            <div className="rounded-2xl gradient-bg p-6 text-primary-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70">Selected Class</p>
                  <h2 className="text-xl font-bold">{selectedClass.subject}</h2>
                  <p className="text-sm text-white/80">{selectedClass.code} • {selectedClass.room}</p>
                </div>
                <Badge className="bg-white/20 text-white border-white/30">
                  Ready to Check In
                </Badge>
              </div>
            </div>
            <StudentWindowTimer
              sessionDate={selectedClass.sessionDate}
              sessionStartTime={selectedClass.sessionStartTime}
              attendanceWindowMinutes={selectedClass.attendanceWindowMinutes}
              isActive={true}
            />
          </div>
        )}

        {/* Method Selection */}
        <div className="grid grid-cols-3 gap-4">
          {methods.map((method) => (
            <button
              key={method.id}
              onClick={() => {
                setSelectedMethod(method.id);
                resetCheckIn();
              }}
              disabled={status === 'processing'}
              className={cn(
                "p-6 rounded-2xl border-2 transition-all duration-300 text-left",
                selectedMethod === method.id
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-primary/50 hover:bg-secondary/50"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                selectedMethod === method.id ? "gradient-bg" : "bg-secondary"
              )}>
                <method.icon className={cn(
                  "w-6 h-6",
                  selectedMethod === method.id ? "text-primary-foreground" : "text-muted-foreground"
                )} />
              </div>
              <h3 className="font-semibold mb-1">{method.label}</h3>
              <p className="text-sm text-muted-foreground">{method.description}</p>
            </button>
          ))}
        </div>

        {/* Check-in Area */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Face Recognition */}
          {selectedMethod === 'face' && (
            <div className="p-8">
              {selectedClass ? (
                <FaceCheckIn
                  sessionId={selectedClass.sessionId}
                  onSuccess={() => {
                    setStatus('success');
                  }}
                />
              ) : (
                <div className="text-center py-12">
                  <ScanFace className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select an active session above to check in with face recognition</p>
                </div>
              )}
            </div>
          )}

          {/* QR Code */}
          {selectedMethod === 'qr' && (
            <div className="p-8">
              <QRScanner
                onSuccess={(result) => {
                  setStatus('success');
                  toast({
                    title: 'Check-in successful!',
                    description: `Marked ${result.status} for ${result.className}`,
                  });
                }}
              />
            </div>
          )}

          {/* Proximity */}
          {selectedMethod === 'proximity' && (
            <div className="p-8">
              {selectedClass ? (
                <ProximityCheckIn
                  sessionId={selectedClass.sessionId}
                  classId={selectedClass.classId}
                  classRoom={selectedClass.room}
                  onSuccess={() => setStatus('success')}
                />
              ) : (
                <div className="text-center py-12">
                  <MapPin className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select an active session above to check in with GPS proximity</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reset Button */}
        {status === 'success' && (
          <div className="text-center">
            <Button variant="outline" onClick={resetCheckIn}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Check in to another class
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
