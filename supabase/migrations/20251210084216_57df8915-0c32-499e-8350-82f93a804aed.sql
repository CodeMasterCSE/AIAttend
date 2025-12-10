-- Fix infinite recursion by using a security definer function for enrollment check
CREATE OR REPLACE FUNCTION public.is_enrolled_in_class(_user_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_enrollments
    WHERE student_id = _user_id
      AND class_id = _class_id
  )
$$;

-- Drop the problematic student policy
DROP POLICY IF EXISTS "Students can view enrolled classes" ON public.classes;

-- Recreate using the security definer function (bypasses RLS on class_enrollments)
CREATE POLICY "Students can view enrolled classes" 
ON public.classes 
FOR SELECT 
TO authenticated
USING (public.is_enrolled_in_class(auth.uid(), id));