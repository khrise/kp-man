-- Seed data for Sports Club Planning Application
-- Version 1.0

-- Insert admin user (password: admin123 - properly hashed with bcrypt)
INSERT INTO users (username, password_hash, email) VALUES
('admin', '$2b$10$iVj89VfPFGqOAVRJIifLoudLyXHM0v3e8m/cZ2EO23rMLsZSvlk5W', 'admin@sportsclub.com')
ON CONFLICT (username) DO UPDATE SET 
password_hash = EXCLUDED.password_hash;

-- Insert seasons
INSERT INTO seasons (name, start_date, end_date, access_code, is_active) VALUES
('Saison 2025/2026', '2025-09-01', '2026-06-30', 'SEASON2025', true),
('Saison 2024/2025', '2024-09-01', '2025-06-30', 'SEASON2024', false);

-- Insert teams
INSERT INTO teams (season_id, name, league) VALUES
(1, 'H40', 'Herren 40 Bezirksliga'),
(1, 'H00', 'Herren Kreisliga');

-- Insert players
INSERT INTO players (first_name, last_name, email, phone) VALUES
('Christof', 'Hahn', 'christof.hahn@example.com', '+49 123 456789'),
('Michael', 'Schmidt', 'michael.schmidt@example.com', '+49 123 456790'),
('Thomas', 'Müller', 'thomas.mueller@example.com', '+49 123 456791'),
('Andreas', 'Weber', 'andreas.weber@example.com', '+49 123 456792');

-- Assign players to teams
INSERT INTO team_players (team_id, player_id, player_rank) VALUES
-- H40 team
(1, 1, 1), (1, 2, 2), (1, 3, 3),
-- H00 team
(2, 2, 1), (2, 3, 2);

-- Insert ties (matches)
INSERT INTO ties (team_id, opponent, tie_date, location, is_home, notes) VALUES
(1, '1. TC Neustadt', '2025-11-09 13:00:00', 'Rammenau', true, 'Heimspiel'),
(2, 'BW DD Blasewitz III', '2025-11-22 10:00:00', 'Weinböhla', true, 'Wichtiges Spiel'),
(1, 'Planeta Radebeul', '2025-11-23 14:00:00', 'Weinböhla', true, 'Letztes Heimspiel'),
(1, 'TC Grün-Weiß Dresden', '2025-12-07 15:00:00', 'Dresden', false, 'Auswärtsspiel'),
(2, 'SV Radebeul', '2025-12-14 11:00:00', 'Radebeul', false, 'Derby');

-- Insert participations
INSERT INTO participations (tie_id, player_id, status) VALUES
-- Tie 1: H40 gegen 1. TC Neustadt
(1, 1, 'confirmed'),
-- Tie 2: H00 gegen BW DD Blasewitz III
(2, 2, 'maybe'),
-- Tie 3: H40 gegen Planeta Radebeul
(3, 1, 'declined');
