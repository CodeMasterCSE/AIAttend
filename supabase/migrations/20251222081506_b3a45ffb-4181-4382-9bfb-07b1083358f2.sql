-- Add closed_reason column to attendance_sessions
ALTER TABLE public.attendance_sessions 
ADD COLUMN IF NOT EXISTS closed_reason TEXT;

-- Add status and rescheduling columns to class_schedules
ALTER TABLE public.class_schedules 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled',
ADD COLUMN IF NOT EXISTS rescheduled_to_id UUID REFERENCES public.class_schedules(id),
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
ADD COLUMN IF NOT EXISTS original_schedule_id UUID REFERENCES public.class_schedules(id);

-- Add constraint to validate status values
ALTER TABLE public.class_schedules 
ADD CONSTRAINT class_schedules_status_check 
CHECK (status IN ('scheduled', 'cancelled', 'rescheduled'));

-- Create index for faster queries on active schedules
CREATE INDEX IF NOT EXISTS idx_class_schedules_status ON public.class_schedules(status);

-- Create index for finding rescheduled classes
CREATE INDEX IF NOT EXISTS idx_class_schedules_original ON public.class_schedules(original_schedule_id);

-- Add comment for documentation
COMMENT ON COLUMN public.attendance_sessions.closed_reason IS 'Reason for session closure: manual, time_expired, class_cancelled';
COMMENT ON COLUMN public.class_schedules.status IS 'Schedule status: scheduled, cancelled, rescheduled';
COMMENT ON COLUMN public.class_schedules.rescheduled_to_id IS 'Reference to the new schedule if this one was rescheduled';
COMMENT ON COLUMN public.class_schedules.original_schedule_id IS 'Reference to the original schedule if this is a rescheduled class';