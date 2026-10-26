ALTER TABLE ties
  ADD COLUMN IF NOT EXISTS captain_comment TEXT,
  ADD COLUMN IF NOT EXISTS captain_comment_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS captain_comment_author_username VARCHAR(255);

ALTER TABLE participations
  ADD COLUMN IF NOT EXISTS captain_comment TEXT,
  ADD COLUMN IF NOT EXISTS captain_comment_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS captain_comment_author_username VARCHAR(255);

ALTER TABLE participation_audit
  ADD COLUMN IF NOT EXISTS previous_captain_comment TEXT,
  ADD COLUMN IF NOT EXISTS new_captain_comment TEXT;
