-- Add location coordinates to classes for proximity verification
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric,
ADD COLUMN IF NOT EXISTS proximity_radius_meters integer DEFAULT 50;

-- Add comment for clarity
COMMENT ON COLUMN public.classes.latitude IS 'Classroom GPS latitude coordinate';
COMMENT ON COLUMN public.classes.longitude IS 'Classroom GPS longitude coordinate';
COMMENT ON COLUMN public.classes.proximity_radius_meters IS 'Allowed radius in meters for proximity check-in';