-- Create admin_settings table for storing admin configuration
CREATE TABLE IF NOT EXISTS admin_settings (
  id TEXT PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add RLS policy to prevent public access
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read settings
CREATE POLICY "Admins can read admin settings" ON admin_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Only admins can update settings
CREATE POLICY "Admins can update admin settings" ON admin_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Only admins can insert settings
CREATE POLICY "Admins can insert admin settings" ON admin_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Only admins can delete settings
CREATE POLICY "Admins can delete admin settings" ON admin_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
