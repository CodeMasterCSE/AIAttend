import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Wifi, 
  MapPin, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Navigation,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProximityCheckInProps {
  sessionId: string;
  classId: string;
  classRoom: string;
  onSuccess?: () => void;
}

interface LocationState {
  status: 'idle' | 'requesting' | 'acquired' | 'error';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  error?: string;
}

interface ClassLocation {
  latitude: number | null;
  longitude: number | null;
  proximity_radius_meters: number | null;
}

export function ProximityCheckIn({ sessionId, classId, classRoom, onSuccess }: ProximityCheckInProps) {
  const [location, setLocation] = useState<LocationState>({ status: 'idle' });
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');
  const [classLocation, setClassLocation] = useState<ClassLocation | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch class location on mount
  useEffect(() => {
    const fetchClassLocation = async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('latitude, longitude, proximity_radius_meters')
        .eq('id', classId)
        .single();

      if (!error && data) {
        setClassLocation(data);
      }
    };

    fetchClassLocation();
  }, [classId]);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocation({
        status: 'error',
        error: 'Geolocation is not supported by your browser',
      });
      return;
    }

    setLocation({ status: 'requesting' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          status: 'acquired',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        setLocation({ status: 'error', error: errorMessage });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const verifyProximity = async () => {
    if (!location.latitude || !location.longitude || !user) return;

    setVerificationStatus('verifying');

    try {
      // Check if class has location configured
      if (!classLocation?.latitude || !classLocation?.longitude) {
        // If no classroom location configured, allow check-in with warning
        toast({
          title: "Location not configured",
          description: "Classroom location not set. Check-in allowed based on your GPS coordinates.",
          variant: "default",
        });

        // Record attendance with proximity method
        const { error } = await supabase.from('attendance_records').insert({
          session_id: sessionId,
          class_id: classId,
          student_id: user.id,
          method_used: 'proximity',
          status: 'present',
          verification_score: location.accuracy ? Math.max(0, 100 - location.accuracy) / 100 : 0.5,
        });

        if (error) {
          if (error.code === '23505') {
            toast({
              title: "Already checked in",
              description: "You have already marked attendance for this session.",
              variant: "destructive",
            });
          } else {
            throw error;
          }
          setVerificationStatus('failed');
          return;
        }

        setVerificationStatus('success');
        onSuccess?.();
        return;
      }

      // Calculate distance from classroom
      const distanceMeters = calculateDistance(
        location.latitude,
        location.longitude,
        classLocation.latitude,
        classLocation.longitude
      );

      setDistance(distanceMeters);

      const allowedRadius = classLocation.proximity_radius_meters || 50;
      const isWithinRange = distanceMeters <= allowedRadius;

      if (isWithinRange) {
        // Record attendance
        const verificationScore = Math.max(0, (allowedRadius - distanceMeters) / allowedRadius);
        
        const { error } = await supabase.from('attendance_records').insert({
          session_id: sessionId,
          class_id: classId,
          student_id: user.id,
          method_used: 'proximity',
          status: 'present',
          verification_score: verificationScore,
        });

        if (error) {
          if (error.code === '23505') {
            toast({
              title: "Already checked in",
              description: "You have already marked attendance for this session.",
              variant: "destructive",
            });
          } else {
            throw error;
          }
          setVerificationStatus('failed');
          return;
        }

        setVerificationStatus('success');
        toast({
          title: "Check-in successful!",
          description: `You are ${Math.round(distanceMeters)}m from ${classRoom}. Attendance marked.`,
        });
        onSuccess?.();
      } else {
        setVerificationStatus('failed');
        toast({
          title: "Too far from classroom",
          description: `You are ${Math.round(distanceMeters)}m away. Must be within ${allowedRadius}m of ${classRoom}.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Proximity verification error:', error);
      setVerificationStatus('failed');
      toast({
        title: "Verification failed",
        description: "Unable to verify your proximity. Please try again.",
        variant: "destructive",
      });
    }
  };

  const reset = () => {
    setLocation({ status: 'idle' });
    setVerificationStatus('idle');
    setDistance(null);
  };

  return (
    <div className="text-center space-y-6">
      {/* Location Status Display */}
      <div className="w-48 h-48 mx-auto relative">
        {/* Animated rings */}
        {(location.status === 'requesting' || verificationStatus === 'verifying') && (
          <>
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-4 rounded-full border-4 border-primary/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
            <div className="absolute inset-8 rounded-full border-4 border-primary/40 animate-ping" style={{ animationDuration: '2s', animationDelay: '1s' }} />
          </>
        )}
        
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
            verificationStatus === 'success' && "bg-success",
            verificationStatus === 'failed' && "bg-destructive",
            verificationStatus === 'idle' && location.status === 'acquired' && "bg-primary",
            (location.status === 'idle' || location.status === 'requesting') && verificationStatus === 'idle' && "gradient-bg",
            location.status === 'error' && "bg-destructive"
          )}>
            {location.status === 'requesting' && (
              <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
            )}
            {location.status === 'idle' && verificationStatus === 'idle' && (
              <MapPin className="w-10 h-10 text-primary-foreground" />
            )}
            {location.status === 'acquired' && verificationStatus === 'idle' && (
              <Navigation className="w-10 h-10 text-primary-foreground" />
            )}
            {verificationStatus === 'verifying' && (
              <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
            )}
            {verificationStatus === 'success' && (
              <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
            )}
            {verificationStatus === 'failed' && (
              <XCircle className="w-10 h-10 text-primary-foreground" />
            )}
            {location.status === 'error' && (
              <AlertTriangle className="w-10 h-10 text-primary-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Status Messages */}
      <div className="space-y-2">
        {location.status === 'idle' && verificationStatus === 'idle' && (
          <>
            <h3 className="text-lg font-semibold">Enable Location Access</h3>
            <p className="text-muted-foreground text-sm">
              Allow location access to verify you're in the classroom
            </p>
          </>
        )}

        {location.status === 'requesting' && (
          <>
            <h3 className="text-lg font-semibold">Acquiring Location...</h3>
            <p className="text-muted-foreground text-sm">
              Please wait while we get your GPS coordinates
            </p>
          </>
        )}

        {location.status === 'error' && (
          <>
            <h3 className="text-lg font-semibold text-destructive">Location Error</h3>
            <p className="text-muted-foreground text-sm">{location.error}</p>
          </>
        )}

        {location.status === 'acquired' && verificationStatus === 'idle' && (
          <>
            <h3 className="text-lg font-semibold text-primary">Location Acquired</h3>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>Accuracy: ±{Math.round(location.accuracy || 0)}m</span>
            </div>
            <Badge variant="secondary" className="mt-2">
              Ready to verify proximity
            </Badge>
          </>
        )}

        {verificationStatus === 'verifying' && (
          <>
            <h3 className="text-lg font-semibold">Verifying Proximity...</h3>
            <p className="text-muted-foreground text-sm">
              Checking distance to {classRoom}
            </p>
          </>
        )}

        {verificationStatus === 'success' && (
          <>
            <h3 className="text-xl font-bold text-success">Check-in Successful!</h3>
            <p className="text-muted-foreground">
              {distance !== null 
                ? `You are ${Math.round(distance)}m from ${classRoom}` 
                : `Proximity verified at ${classRoom}`
              }
            </p>
          </>
        )}

        {verificationStatus === 'failed' && distance !== null && (
          <>
            <h3 className="text-lg font-semibold text-destructive">Too Far Away</h3>
            <p className="text-muted-foreground text-sm">
              You are {Math.round(distance)}m from the classroom.
              <br />
              Must be within {classLocation?.proximity_radius_meters || 50}m to check in.
            </p>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        {location.status === 'idle' && (
          <Button variant="gradient" size="lg" onClick={requestLocation}>
            <MapPin className="w-5 h-5 mr-2" />
            Enable Location
          </Button>
        )}

        {location.status === 'error' && (
          <Button variant="outline" size="lg" onClick={requestLocation}>
            <RefreshCw className="w-5 h-5 mr-2" />
            Try Again
          </Button>
        )}

        {location.status === 'acquired' && verificationStatus === 'idle' && (
          <Button variant="gradient" size="lg" onClick={verifyProximity}>
            <Wifi className="w-5 h-5 mr-2" />
            Verify Proximity
          </Button>
        )}

        {(verificationStatus === 'success' || verificationStatus === 'failed') && (
          <Button variant="outline" size="lg" onClick={reset}>
            <RefreshCw className="w-5 h-5 mr-2" />
            {verificationStatus === 'failed' ? 'Try Again' : 'Check Another Class'}
          </Button>
        )}
      </div>

      {/* Info Note */}
      {location.status === 'idle' && (
        <p className="text-xs text-muted-foreground">
          Your location is only used to verify classroom presence and is not stored.
        </p>
      )}
    </div>
  );
}
