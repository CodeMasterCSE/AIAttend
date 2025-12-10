import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FaceRegistrationProps {
  onSuccess?: () => void;
}

export function FaceRegistration({ onSuccess }: FaceRegistrationProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraReady(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setCameraReady(true);
          }).catch(err => {
            console.error('Video play error:', err);
            toast.error('Could not start video playback');
          });
        };
      }
      
      setIsCapturing(true);
      setCapturedImage(null);
      setStatus('idle');
    } catch (error) {
      console.error('Camera access error:', error);
      toast.error('Could not access camera. Please check permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setCameraReady(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Camera not ready. Please try again.');
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Ensure video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('Camera not ready yet. Please wait a moment.');
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror the image horizontally for selfie view
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      console.log('Captured image data length:', imageData.length);
      setCapturedImage(imageData);
      stopCamera();
    }
  }, [stopCamera]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedImage(e.target?.result as string);
      setStatus('idle');
    };
    reader.readAsDataURL(file);
  };

  const registerFace = async () => {
    if (!capturedImage) {
      toast.error('Please capture or upload a photo first');
      return;
    }

    setIsProcessing(true);
    setStatus('idle');

    try {
      const { data, error } = await supabase.functions.invoke('register-face', {
        body: { imageBase64: capturedImage }
      });

      if (error) throw error;

      if (data.success) {
        setStatus('success');
        toast.success(data.message);
        onSuccess?.();
      } else {
        setStatus('error');
        toast.error(data.error || 'Failed to register face');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setStatus('error');
      toast.error('Failed to register face. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setStatus('idle');
    stopCamera();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Face Registration
        </CardTitle>
        <CardDescription>
          Register your face for quick attendance check-in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          {isCapturing ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Camera className="h-12 w-12 opacity-50" />
            </div>
          )}
          
          {status === 'success' && (
            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
          )}
          
          {status === 'error' && (
            <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
          )}
        </div>
        
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex flex-wrap gap-2">
          {!isCapturing && !capturedImage && (
            <>
              <Button onClick={startCamera} className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Open Camera
              </Button>
              <label className="flex-1">
                <Button variant="outline" className="w-full" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </>
          )}
          
          {isCapturing && (
            <>
              <Button onClick={capturePhoto} className="flex-1" disabled={!cameraReady}>
                {cameraReady ? 'Capture Photo' : 'Loading...'}
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                Cancel
              </Button>
            </>
          )}
          
          {capturedImage && !isProcessing && status === 'idle' && (
            <>
              <Button onClick={registerFace} className="flex-1">
                Register Face
              </Button>
              <Button variant="outline" onClick={reset}>
                Retake
              </Button>
            </>
          )}
          
          {isProcessing && (
            <Button disabled className="flex-1">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </Button>
          )}
          
          {status === 'success' && (
            <Button variant="outline" onClick={reset} className="w-full">
              Register New Photo
            </Button>
          )}
          
          {status === 'error' && (
            <Button onClick={reset} className="w-full">
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
