import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  RefreshCw,
  PartyPopper,
  Info,
  Clock,
  Shield,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProximityCheckInProps {
  sessionId: string;
  classId: string;
  classRoom: string;
  onSuccess?: () => void;
}

interface LocationState {
  status: 'idle' | 'requesting' | 'acquired' | 'timeout' | 'error';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  error?: string;
  attemptCount: number;
  usingHighAccuracy: boolean;
}

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'already_checked_in' | 'failed' | 'pending_review';

// Tiered geolocation configuration
const LOCATION_CONFIG = {
  // First attempt: medium accuracy, faster response
  medium: {
    enableHighAccuracy: false,
    timeout: 8000,
    maximumAge: 60000, // Allow cached location up to 60 seconds
  },
  // Fallback: high accuracy if medium fails
  high: {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 30000,
  },
};

export function ProximityCheckIn({ sessionId, classId, classRoom, onSuccess }: ProximityCheckInProps) {
  const [location, setLocation] = useState<LocationState>({ 
    status: 'idle', 
    attemptCount: 0, 
    usingHighAccuracy: false 
  });
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  const [distance, setDistance] = useState<number | null>(null);
  const [allowedRadius, setAllowedRadius] = useState<number>(50);
  const [locationProgress, setLocationProgress] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  const requestLocation = useCallback((useHighAccuracy = false) => {
    if (!navigator.geolocation) {
      setLocation({
        status: 'error',
        error: 'Geolocation is not supported by your browser',
        attemptCount: location.attemptCount + 1,
        usingHighAccuracy: false,
      });
      return;
    }

    setLocation(prev => ({ 
      ...prev, 
      status: 'requesting', 
      usingHighAccuracy: useHighAccuracy 
    }));
    setLocationProgress(0);

    // Progress animation
    const progressInterval = setInterval(() => {
      setLocationProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    const config = useHighAccuracy ? LOCATION_CONFIG.high : LOCATION_CONFIG.medium;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearInterval(progressInterval);
        setLocationProgress(100);
        setLocation({
          status: 'acquired',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          attemptCount: location.attemptCount + 1,
          usingHighAccuracy: useHighAccuracy,
        });
      },
      (error) => {
        clearInterval(progressInterval);
        
        // If medium accuracy failed, try high accuracy as fallback
        if (!useHighAccuracy && error.code === error.TIMEOUT) {
          console.log('Medium accuracy timed out, trying high accuracy...');
          requestLocation(true);
          return;
        }

        let errorMessage = 'Unable to retrieve your location';
        let status: LocationState['status'] = 'error';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. This may be due to indoor conditions.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. You can still check in - your attendance will be flagged for review.';
            status = 'timeout';
            break;
        }
        
        setLocation({
          status,
          error: errorMessage,
          attemptCount: location.attemptCount + 1,
          usingHighAccuracy: useHighAccuracy,
        });
      },
      config
    );
  }, [location.attemptCount]);

  const verifyProximity = async (isTimeoutFallback = false) => {
    if (!user) return;

    // For timeout fallback, we send without coordinates
    if (!isTimeoutFallback && (!location.latitude || !location.longitude)) return;

    setVerificationStatus('verifying');

    try {
      const { data, error } = await supabase.functions.invoke('verify-proximity', {
        body: {
          sessionId,
          classId,
          latitude: location.latitude ?? null,
          longitude: location.longitude ?? null,
          accuracy: location.accuracy ?? null,
          isTimeoutFallback,
          locationStatus: location.status,
        },
      });

      // Handle edge function errors
      if (error) {
        const handleFailure = (title: string, message: string) => {
          setVerificationStatus('failed');
          toast({
            title,
            description: message,
            variant: "destructive",
          });
        };

        const errorContext = (error as unknown as { context?: Response }).context;
        if (errorContext) {
          try {
            const errorBody = await errorContext.clone().json();
            if (errorBody?.distance !== undefined && errorBody?.allowedRadius !== undefined) {
              setDistance(errorBody.distance);
              setAllowedRadius(errorBody.allowedRadius);
              setVerificationStatus('failed');
              toast({
                title: "Too far from classroom",
                description: `You are ${errorBody.distance}m away. Must be within ${errorBody.allowedRadius}m of ${errorBody.room || classRoom}.`,
                variant: "destructive",
              });
              return;
            }
            if (errorBody?.error === 'You are not enrolled in this class') {
              handleFailure("Not Enrolled", "You are not enrolled in this class.");
              return;
            }
            if (errorBody?.error) {
              handleFailure("Check-in Failed", errorBody.error);
              return;
            }
          } catch {
            // Fall back below
          }
        }

        const msg = typeof error.message === 'string' ? error.message : '';
        const jsonMatch = msg.match(/\{[\s\S]*\}$/);
        if (jsonMatch?.[0]) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed?.distance !== undefined && parsed?.allowedRadius !== undefined) {
              setDistance(parsed.distance);
              setAllowedRadius(parsed.allowedRadius);
              setVerificationStatus('failed');
              toast({
                title: "Too far from classroom",
                description: `You are ${parsed.distance}m away. Must be within ${parsed.allowedRadius}m of ${parsed.room || classRoom}.`,
                variant: "destructive",
              });
              return;
            }
            if (parsed?.error) {
              handleFailure("Check-in Failed", parsed.error);
              return;
            }
          } catch {
            // ignore
          }
        }

        if (msg.startsWith('Edge function returned')) {
          handleFailure("Check-in Failed", msg);
          return;
        }

        throw new Error(error.message || 'Verification failed');
      }

      // Handle successful response with error field
      if (data?.error) {
        if (data.distance !== undefined && data.allowedRadius !== undefined) {
          setDistance(data.distance);
          setAllowedRadius(data.allowedRadius);
          setVerificationStatus('failed');
          toast({
            title: "Too far from classroom",
            description: `You are ${data.distance}m away. Must be within ${data.allowedRadius}m of ${data.room || classRoom}.`,
            variant: "destructive",
          });
        } else if (data.error === 'You are not enrolled in this class') {
          setVerificationStatus('failed');
          toast({
            title: "Not Enrolled",
            description: "You are not enrolled in this class.",
            variant: "destructive",
          });
        } else {
          setVerificationStatus('failed');
          toast({
            title: "Check-in Failed",
            description: data.error,
            variant: "destructive",
          });
        }
        return;
      }

      // Handle pending review status (timeout fallback)
      if (data?.proximityStatus === 'unverified') {
        setVerificationStatus('pending_review');
        toast({
          title: "Attendance Recorded",
          description: "Location couldn't be verified. Your attendance is recorded and flagged for professor review.",
        });
        onSuccess?.();
        return;
      }

      // Success or already checked in
      if (data?.alreadyCheckedIn) {
        setVerificationStatus('already_checked_in');
        toast({
          title: "Already Checked In",
          description: "Your attendance was already recorded for this session.",
        });
      } else {
        if (data?.distance !== null && data?.distance !== undefined) {
          setDistance(data.distance);
        }
        setVerificationStatus('success');
        toast({
          title: "Check-in Successful!",
          description: data?.message || "Your attendance has been recorded.",
        });
      }
      onSuccess?.();

    } catch (error) {
      console.error('Proximity verification error:', error);
      setVerificationStatus('failed');
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Unable to verify your proximity. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTimeoutFallback = () => {
    verifyProximity(true);
  };

  const reset = () => {
    setLocation({ status: 'idle', attemptCount: 0, usingHighAccuracy: false });
    setVerificationStatus('idle');
    setDistance(null);
    setLocationProgress(0);
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
            verificationStatus === 'success' && "bg-green-500",
            verificationStatus === 'already_checked_in' && "bg-blue-500",
            verificationStatus === 'pending_review' && "bg-warning",
            verificationStatus === 'failed' && "bg-destructive",
            verificationStatus === 'idle' && location.status === 'acquired' && "bg-primary",
            (location.status === 'idle' || location.status === 'requesting') && verificationStatus === 'idle' && "gradient-bg",
            location.status === 'error' && "bg-destructive",
            location.status === 'timeout' && "bg-warning"
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
            {location.status === 'timeout' && verificationStatus === 'idle' && (
              <Clock className="w-10 h-10 text-primary-foreground" />
            )}
            {verificationStatus === 'verifying' && (
              <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
            )}
            {verificationStatus === 'success' && (
              <PartyPopper className="w-10 h-10 text-primary-foreground" />
            )}
            {verificationStatus === 'pending_review' && (
              <Eye className="w-10 h-10 text-primary-foreground" />
            )}
            {verificationStatus === 'already_checked_in' && (
              <Info className="w-10 h-10 text-primary-foreground" />
            )}
            {verificationStatus === 'failed' && (
              <XCircle className="w-10 h-10 text-primary-foreground" />
            )}
            {location.status === 'error' && verificationStatus === 'idle' && (
              <AlertTriangle className="w-10 h-10 text-primary-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Progress bar during location request */}
      {location.status === 'requesting' && (
        <div className="max-w-xs mx-auto space-y-2">
          <Progress value={locationProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {location.usingHighAccuracy ? 'Using high accuracy GPS...' : 'Acquiring location...'}
          </p>
        </div>
      )}

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
            <h3 className="text-lg font-semibold">Checking Location...</h3>
            <p className="text-muted-foreground text-sm">
              {location.usingHighAccuracy 
                ? 'Using high accuracy mode for better precision'
                : 'Getting your location for proximity verification'
              }
            </p>
          </>
        )}

        {location.status === 'error' && verificationStatus === 'idle' && (
          <>
            <h3 className="text-lg font-semibold text-destructive">Location Error</h3>
            <p className="text-muted-foreground text-sm">{location.error}</p>
          </>
        )}

        {location.status === 'timeout' && verificationStatus === 'idle' && (
          <>
            <h3 className="text-lg font-semibold text-warning">Location Timed Out</h3>
            <p className="text-muted-foreground text-sm">
              GPS couldn't get your location in time. This often happens indoors.
            </p>
            <Badge variant="outline" className="border-warning text-warning">
              <Clock className="w-3 h-3 mr-1" />
              You can still check in with review
            </Badge>
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
            <h3 className="text-xl font-bold text-green-600">Check-in Successful!</h3>
            <p className="text-green-600">Your attendance has been recorded.</p>
            <p className="text-muted-foreground text-sm">
              {distance !== null 
                ? `You are ${Math.round(distance)}m from ${classRoom}` 
                : `Proximity verified at ${classRoom}`
              }
            </p>
          </>
        )}

        {verificationStatus === 'pending_review' && (
          <>
            <h3 className="text-xl font-bold text-warning">Attendance Recorded</h3>
            <div className="flex items-center justify-center gap-2 text-warning">
              <Shield className="w-5 h-5" />
              <span>Pending Professor Review</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Location couldn't be verified. Your professor will review your attendance.
            </p>
          </>
        )}

        {verificationStatus === 'already_checked_in' && (
          <>
            <h3 className="text-xl font-bold text-blue-600">Already Checked In</h3>
            <p className="text-blue-600">Your attendance was already recorded for this session.</p>
          </>
        )}

        {verificationStatus === 'failed' && distance !== null && (
          <>
            <h3 className="text-lg font-semibold text-destructive">Too Far Away</h3>
            <p className="text-muted-foreground text-sm">
              You are {Math.round(distance)}m from the classroom.
              <br />
              Must be within {allowedRadius}m to check in.
            </p>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        {location.status === 'idle' && verificationStatus === 'idle' && (
          <Button variant="gradient" size="lg" onClick={() => requestLocation(false)}>
            <MapPin className="w-5 h-5 mr-2" />
            Enable Location
          </Button>
        )}

        {location.status === 'error' && verificationStatus === 'idle' && (
          <Button variant="outline" size="lg" onClick={() => requestLocation(false)}>
            <RefreshCw className="w-5 h-5 mr-2" />
            Try Again
          </Button>
        )}

        {location.status === 'timeout' && verificationStatus === 'idle' && (
          <div className="space-y-3">
            <Button variant="outline" size="lg" onClick={() => requestLocation(true)}>
              <RefreshCw className="w-5 h-5 mr-2" />
              Retry with High Accuracy
            </Button>
            <Button variant="gradient" size="lg" onClick={handleTimeoutFallback}>
              <Shield className="w-5 h-5 mr-2" />
              Check In Anyway (Review Required)
            </Button>
            <p className="text-xs text-muted-foreground">
              Your attendance will be recorded but flagged for professor review
            </p>
          </div>
        )}

        {location.status === 'acquired' && verificationStatus === 'idle' && (
          <Button variant="gradient" size="lg" onClick={() => verifyProximity(false)}>
            <Wifi className="w-5 h-5 mr-2" />
            Verify Proximity
          </Button>
        )}

        {(verificationStatus === 'success' || verificationStatus === 'pending_review' || verificationStatus === 'already_checked_in' || verificationStatus === 'failed') && (
          <Button variant="outline" size="lg" onClick={reset}>
            <RefreshCw className="w-5 h-5 mr-2" />
            {verificationStatus === 'failed' ? 'Try Again' : 'Done'}
          </Button>
        )}
      </div>

      {/* Info Note */}
      {location.status === 'idle' && verificationStatus === 'idle' && (
        <p className="text-xs text-muted-foreground">
          Your location is only used to verify classroom presence and is not stored permanently.
        </p>
      )}
    </div>
  );
}
