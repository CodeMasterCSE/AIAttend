import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function CalendarCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useGoogleCalendar();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMessage('Authorization was denied');
      setTimeout(() => navigate('/student/timetable'), 3000);
      return;
    }

    if (code && state) {
      handleCallback(code, state)
        .then(() => {
          setStatus('success');
          setTimeout(() => navigate('/student/timetable'), 2000);
        })
        .catch((err) => {
          console.error('Callback error:', err);
          setStatus('error');
          setErrorMessage(err.message || 'Failed to connect calendar');
          setTimeout(() => navigate('/student/timetable'), 3000);
        });
    } else {
      setStatus('error');
      setErrorMessage('Invalid callback parameters');
      setTimeout(() => navigate('/student/timetable'), 3000);
    }
  }, [searchParams, handleCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {status === 'loading' && (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <div>
                  <h2 className="text-xl font-semibold">Connecting Calendar</h2>
                  <p className="text-sm text-muted-foreground">
                    Please wait while we connect your Google Calendar...
                  </p>
                </div>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="w-12 h-12 text-success" />
                <div>
                  <h2 className="text-xl font-semibold">Calendar Connected!</h2>
                  <p className="text-sm text-muted-foreground">
                    Redirecting to your timetable...
                  </p>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="w-12 h-12 text-destructive" />
                <div>
                  <h2 className="text-xl font-semibold">Connection Failed</h2>
                  <p className="text-sm text-muted-foreground">{errorMessage}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Redirecting back...
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
