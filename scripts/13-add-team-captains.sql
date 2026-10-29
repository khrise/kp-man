CREATE TABLE IF NOT EXISTS team_captains (
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS team_captains_user_id_idx ON team_captains(user_id);

-- Lock the user row to serialize assignments with concurrent role changes.
CREATE OR REPLACE FUNCTION check_team_captain_role() RETURNS trigger AS $$
BEGIN
  PERFORM 1 FROM users WHERE id = NEW.user_id AND role = 'team_captain' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only team_captain users can be assigned to teams'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS team_captains_check_role ON team_captains;
CREATE TRIGGER team_captains_check_role
  BEFORE INSERT OR UPDATE ON team_captains
  FOR EACH ROW EXECUTE FUNCTION check_team_captain_role();

CREATE OR REPLACE FUNCTION clear_team_captain_assignments() RETURNS trigger AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM 'team_captain' THEN
    DELETE FROM team_captains WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_clear_captain_assignments ON users;
CREATE TRIGGER users_clear_captain_assignments
  AFTER UPDATE OF role ON users
  FOR EACH ROW EXECUTE FUNCTION clear_team_captain_assignments();
