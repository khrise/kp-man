-- Add role-based user management system
-- Extends the basic users table with roles and player associations

-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'team_captain', 'player'));

-- Add player association (nullable - not all users need to be players)
ALTER TABLE users ADD COLUMN IF NOT EXISTS player_id INTEGER REFERENCES players(id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_player_id ON users(player_id);

-- Update existing admin user to have admin role (if it exists)
UPDATE users SET role = 'admin' WHERE username = 'admin';