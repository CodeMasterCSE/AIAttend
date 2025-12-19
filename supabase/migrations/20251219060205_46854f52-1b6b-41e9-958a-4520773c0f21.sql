-- Add RLS policy for professors to view verification images from their class sessions
CREATE POLICY "Professors can view verification images for their sessions"
ON public.verification_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM attendance_sessions s
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = verification_images.session_id
    AND c.professor_id = auth.uid()
  )
);