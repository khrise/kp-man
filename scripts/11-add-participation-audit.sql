-- Create participation_audit table to record changes to participation responses
CREATE TABLE IF NOT EXISTS participation_audit (
  id SERIAL PRIMARY KEY,
  participation_id INTEGER,
  player_id INTEGER NOT NULL,
  tie_id INTEGER NOT NULL,
  previous_status VARCHAR(32),
  new_status VARCHAR(32) NOT NULL,
  previous_comment TEXT,
  new_comment TEXT,
  previous_is_in_lineup BOOLEAN,
  new_is_in_lineup BOOLEAN,
  changed_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS participation_audit_tie_idx ON participation_audit(tie_id);
CREATE INDEX IF NOT EXISTS participation_audit_player_idx ON participation_audit(player_id);
CREATE INDEX IF NOT EXISTS participation_audit_created_idx ON participation_audit(created_at);
