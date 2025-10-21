-- Add app settings table for runtime configuration

CREATE TABLE IF NOT EXISTS app_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('string', 'boolean', 'number', 'json')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster key lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Insert default settings
INSERT INTO app_settings (key, value, type, description) VALUES
  ('clubName', 'Tennis Club', 'string', 'Name of the sports club displayed in the application'),
  ('supportEmail', 'support@example.com', 'string', 'Contact email for support inquiries')
ON CONFLICT (key) DO NOTHING;
