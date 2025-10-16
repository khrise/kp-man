-- Add comment field to participations table
ALTER TABLE participations ADD COLUMN IF NOT EXISTS comment TEXT;
