-- Add team_size column to teams table
-- This represents the number of players that participate in a tie

ALTER TABLE teams 
ADD COLUMN team_size INTEGER DEFAULT 6 CHECK (team_size > 0);

-- Update existing teams to have a default team size of 6
UPDATE teams SET team_size = 6 WHERE team_size IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE teams ALTER COLUMN team_size SET NOT NULL;

COMMENT ON COLUMN teams.team_size IS 'Number of players that participate in a tie for this team';