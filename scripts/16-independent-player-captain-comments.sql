CREATE TABLE IF NOT EXISTS player_captain_comments (
  tie_id INTEGER NOT NULL REFERENCES ties(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  captain_comment TEXT,
  captain_comment_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  captain_comment_author_username VARCHAR(255),
  PRIMARY KEY (tie_id, player_id)
);

INSERT INTO player_captain_comments
  (tie_id, player_id, captain_comment, captain_comment_by, captain_comment_author_username)
SELECT tie_id, player_id, captain_comment, captain_comment_by, captain_comment_author_username
FROM participations
WHERE captain_comment IS NOT NULL
ON CONFLICT (tie_id, player_id) DO NOTHING;

ALTER TABLE participations
  DROP COLUMN captain_comment,
  DROP COLUMN captain_comment_by,
  DROP COLUMN captain_comment_author_username;
