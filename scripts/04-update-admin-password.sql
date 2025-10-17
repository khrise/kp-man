-- Update admin user password with bcrypt hash
-- This will be executed during migration if the user doesn't exist
INSERT INTO users (username, password_hash, email) VALUES
('admin', '$2b$10$y.WQ22/crEDrmvijz4KPsuOArQEErP5v4mOmSjQL5fdDJg7.RTUNG', 'admin@sportsclub.com')
ON CONFLICT (username) DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  email = EXCLUDED.email;