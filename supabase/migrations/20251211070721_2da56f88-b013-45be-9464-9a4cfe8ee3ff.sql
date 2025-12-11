-- Fix: Restrict professor profile access to only enrolled students
-- This prevents professors from viewing emails of students not in their classes

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Professors can view all profiles" ON profiles;

-- Create restricted policy for professors to view only enrolled students' profiles
CREATE POLICY "Professors can view enrolled students profiles"
ON profiles FOR SELECT
USING (
  has_role(auth.uid(), 'professor'::app_role) AND
  EXISTS (
    SELECT 1 FROM class_enrollments ce
    JOIN classes c ON ce.class_id = c.id
    WHERE ce.student_id = profiles.user_id
    AND c.professor_id = auth.uid()
  )
);

-- Also allow professors to view their own profile
CREATE POLICY "Professors can view own profile"
ON profiles FOR SELECT
USING (
  has_role(auth.uid(), 'professor'::app_role) AND
  auth.uid() = user_id
);