import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar.events';

export function useGoogleCalendar() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch Google Client ID
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('google-config');
        if (error) throw error;
        setClientId(data.clientId);
      } catch (error) {
        console.error('Error fetching Google config:', error);
      }
    };
    fetchConfig();
  }, []);

  const checkConnection = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'check-connection' },
      });

      if (error) throw error;
      setIsConnected(data.connected);
    } catch (error) {
      console.error('Error checking calendar connection:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const connect = useCallback(async () => {
    if (!clientId) {
      toast.error('Google Calendar not configured');
      return;
    }

    const redirectUri = `${window.location.origin}/calendar-callback`;
    const state = crypto.randomUUID();
    
    // Store state for verification
    sessionStorage.setItem('calendar_oauth_state', state);

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', CALENDAR_SCOPES);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    window.location.href = authUrl.toString();
  }, [clientId]);

  const handleCallback = useCallback(async (code: string, state: string) => {
    const storedState = sessionStorage.getItem('calendar_oauth_state');
    sessionStorage.removeItem('calendar_oauth_state');

    if (state !== storedState) {
      throw new Error('Invalid state parameter');
    }

    const redirectUri = `${window.location.origin}/calendar-callback`;

    const { data, error } = await supabase.functions.invoke('google-calendar', {
      body: { 
        action: 'exchange-code',
        code,
        redirectUri,
      },
    });

    if (error) throw error;
    
    setIsConnected(true);
    return data;
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const { error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'disconnect' },
      });

      if (error) throw error;
      
      setIsConnected(false);
      toast.success('Google Calendar disconnected');
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast.error('Failed to disconnect calendar');
    }
  }, []);

  const syncSchedules = useCallback(async (schedules: Array<{
    id: string;
    day: string;
    start_time: string;
    end_time: string;
    classes: {
      subject: string;
      code: string;
      room: string;
    };
  }>) => {
    if (!isConnected) {
      toast.error('Please connect Google Calendar first');
      return null;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { 
          action: 'sync-schedules',
          schedules,
        },
      });

      if (error) throw error;
      
      toast.success(`Synced ${data.created} events to Google Calendar`);
      return data;
    } catch (error) {
      console.error('Error syncing schedules:', error);
      toast.error('Failed to sync schedules');
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [isConnected]);

  return {
    isConnected,
    isLoading,
    isSyncing,
    connect,
    disconnect,
    handleCallback,
    syncSchedules,
    checkConnection,
  };
}
