-- Add columns for detailed proximity tracking
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS proximity_status text CHECK (proximity_status IN ('verified', 'unverified')),
ADD COLUMN IF NOT EXISTS distance_meters numeric,
ADD COLUMN IF NOT EXISTS failure_reason text;

-- Add comment
COMMENT ON COLUMN attendance_records.proximity_status IS 'Status of proximity verification: confirmed vs. fallback';
COMMENT ON COLUMN attendance_records.distance_meters IS 'Distance from classroom in meters at time of check-in';
COMMENT ON COLUMN attendance_records.failure_reason IS 'Reason why proximity verification was not fully confirmed (e.g., timeout, location_unavailable)';
