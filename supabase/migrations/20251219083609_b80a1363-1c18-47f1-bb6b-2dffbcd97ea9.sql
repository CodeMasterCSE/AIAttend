-- First, delete orphaned enrollments where the student no longer exists
DELETE FROM public.class_enrollments
WHERE student_id NOT IN (SELECT id FROM auth.users);

-- Now add foreign key constraint with CASCADE delete
ALTER TABLE public.class_enrollments
ADD CONSTRAINT class_enrollments_student_id_fkey
FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;