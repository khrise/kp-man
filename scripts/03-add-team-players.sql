-- Add team_players junction table to track player membership and ranking



-- Seed initial team-player relationships
INSERT INTO team_players (team_id, player_id, player_rank) VALUES
  (1, 1, 1),
  (1, 2, 2),
  (2, 2, 1);
