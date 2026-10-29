-- Per-user notification settings

-- channel and window_mode are free-form text so new channels/presets need no migration
CREATE TABLE IF NOT EXISTS notification_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  target TEXT NOT NULL DEFAULT '',
  window_mode VARCHAR(20) NOT NULL DEFAULT 'days_14',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, channel)
);
