-- Update the handle_new_user trigger to enforce role validation
-- This prevents privilege escalation by rejecting admin role during self-registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requested_role text;
  safe_role app_role;
BEGIN
  -- Get the requested role from metadata
  requested_role := NEW.raw_user_meta_data ->> 'role';
  
  -- Only allow 'student' or 'professor' roles during self-registration
  -- Default to 'student' if role is invalid, null, or 'admin'
  IF requested_role IN ('student', 'professor') THEN
    safe_role := requested_role::app_role;
  ELSE
    safe_role := 'student'::app_role;
  END IF;

  INSERT INTO public.profiles (user_id, name, email, department, roll_number, employee_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data ->> 'department',
    NEW.raw_user_meta_data ->> 'roll_number',
    NEW.raw_user_meta_data ->> 'employee_id'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    safe_role
  );
  
  RETURN NEW;
END;
$$;