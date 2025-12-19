-- Create table to store Google Calendar tokens
CREATE TABLE public.calendar_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to track synced calendar events
CREATE TABLE public.calendar_synced_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  schedule_id UUID NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, schedule_id)
);

-- Enable RLS
ALTER TABLE public.calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_synced_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_tokens
CREATE POLICY "Users can view their own tokens"
ON public.calendar_tokens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens"
ON public.calendar_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
ON public.calendar_tokens FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
ON public.calendar_tokens FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for calendar_synced_events
CREATE POLICY "Users can view their own synced events"
ON public.calendar_synced_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own synced events"
ON public.calendar_synced_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own synced events"
ON public.calendar_synced_events FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_calendar_tokens_updated_at
BEFORE UPDATE ON public.calendar_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();