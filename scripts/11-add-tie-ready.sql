-- Add is_lineup_ready column to ties for marking finalized lineups
ALTER TABLE ties
ADD COLUMN is_lineup_ready boolean NOT NULL DEFAULT false;
