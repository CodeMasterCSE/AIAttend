-- Enable required extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule auto-end-sessions to run every minute
SELECT cron.schedule(
  'auto-end-expired-sessions',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xzupccxznjljzhddqenz.supabase.co/functions/v1/auto-end-sessions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6dXBjY3h6bmpsanpoZGRxZW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMzQ2MjIsImV4cCI6MjA4MDkxMDYyMn0.BE3Eb4LBSHYhMM95krAqrLlaM_m2WGHAu7r3dN0oKT0"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);