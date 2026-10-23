-- Add is_current column to seasons table to denote the current season
ALTER TABLE seasons
ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT false;
