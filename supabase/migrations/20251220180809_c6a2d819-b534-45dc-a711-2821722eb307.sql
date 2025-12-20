-- Add attendance_window_minutes to attendance_sessions
ALTER TABLE public.attendance_sessions 
ADD COLUMN IF NOT EXISTS attendance_window_minutes integer NOT NULL DEFAULT 15;

-- Add session_duration_minutes for total session length
ALTER TABLE public.attendance_sessions 
ADD COLUMN IF NOT EXISTS session_duration_minutes integer NOT NULL DEFAULT 60;

-- Create manual attendance audit log table
CREATE TABLE public.attendance_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id uuid REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  action text NOT NULL, -- 'create', 'update', 'delete'
  previous_status text,
  new_status text,
  reason text NOT NULL,
  marked_by uuid NOT NULL, -- professor who made the change
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.attendance_audit_log ENABLE ROW LEVEL SECURITY;

-- Professors can view audit logs for their classes
CREATE POLICY "Professors can view audit logs for their classes"
ON public.attendance_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM attendance_sessions s
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = attendance_audit_log.session_id
    AND c.professor_id = auth.uid()
  )
);

-- Professors can insert audit logs for their classes
CREATE POLICY "Professors can insert audit logs for their classes"
ON public.attendance_audit_log
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM attendance_sessions s
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = attendance_audit_log.session_id
    AND c.professor_id = auth.uid()
  )
  AND marked_by = auth.uid()
);

-- Admins can manage all audit logs
CREATE POLICY "Admins can manage all audit logs"
ON public.attendance_audit_log
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add late_submission flag to attendance_records
ALTER TABLE public.attendance_records 
ADD COLUMN IF NOT EXISTS late_submission boolean NOT NULL DEFAULT false;

-- Add manual_reason for manual overrides
ALTER TABLE public.attendance_records 
ADD COLUMN IF NOT EXISTS manual_reason text;