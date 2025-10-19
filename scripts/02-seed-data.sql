-- Seed data for Sports Club Planning Application
-- Version 1.0

-- Insert admin user (password: admin123 - properly hashed with bcrypt)
INSERT INTO users (username, password_hash, email) VALUES
('admin', '$2b$10$iVj89VfPFGqOAVRJIifLoudLyXHM0v3e8m/cZ2EO23rMLsZSvlk5W', 'admin@sportsclub.com')
ON CONFLICT (username) DO UPDATE SET 
password_hash = EXCLUDED.password_hash;
