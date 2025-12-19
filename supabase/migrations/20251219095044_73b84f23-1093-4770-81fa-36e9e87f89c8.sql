-- Add policy to allow students to delete (unenroll from) their own class enrollments
CREATE POLICY "Students can delete their own enrollments"
ON public.class_enrollments
FOR DELETE
USING (student_id = auth.uid());