-- Add lineup functionality to participations
-- This allows team captains to select which confirmed players will actually play

ALTER TABLE participations 
ADD COLUMN is_in_lineup BOOLEAN DEFAULT false;

-- Add comment to document the purpose
COMMENT ON COLUMN participations.is_in_lineup IS 'Whether this confirmed player is selected for the actual lineup';

-- Add index for better query performance when filtering lineup players
CREATE INDEX IF NOT EXISTS idx_participations_lineup ON participations(tie_id, is_in_lineup) WHERE is_in_lineup = true;