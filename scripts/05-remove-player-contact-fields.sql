-- Remove email and phone fields from players table
-- Players only need first and last name

ALTER TABLE players DROP COLUMN IF EXISTS email;
ALTER TABLE players DROP COLUMN IF EXISTS phone;