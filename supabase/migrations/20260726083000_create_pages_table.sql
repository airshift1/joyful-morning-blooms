-- Create pages table for CMS-style page management
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT,
  content TEXT,
  background_color TEXT DEFAULT '#ffffff',
  background_image_url TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies - only admins can read/write
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Allow public to read published pages
CREATE POLICY "Public can read published pages" ON pages
  FOR SELECT USING (is_published = true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage pages" ON pages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Insert default pages
INSERT INTO pages (id, slug, title, subtitle, content, background_color, is_published)
VALUES
  ('home', 'home', 'Joyful Morning Blooms', 'Handcrafted florals for life\'s moments', 'Welcome to our flower shop', '#ffffff', true),
  ('about', 'about', 'Our story', '', 'Learn about our studio', '#ffffff', true),
  ('contact', 'contact', 'Get in touch', '', 'Contact us', '#ffffff', true),
  ('shop', 'shop', 'Shop', '', 'Browse our arrangements', '#ffffff', true)
ON CONFLICT (slug) DO NOTHING;
