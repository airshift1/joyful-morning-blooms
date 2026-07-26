# How to Enable Pages CMS - Step by Step

## The Problem
You just need to run ONE SQL query to create the pages table. Once it's created, the Pages tab will appear in your admin panel.

## Step 1: Go to Supabase
Open https://supabase.com and log in to your project

## Step 2: Open SQL Editor
- Look on the left sidebar
- Click **"SQL Editor"**
- Click the blue **"New Query"** button

## Step 3: Copy the SQL Code
Copy everything below:

```sql
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
  ('home', 'home', 'Joyful Morning Blooms', 'Handcrafted florals for life''s moments', 'Welcome to our flower shop', '#ffffff', true),
  ('about', 'about', 'Our story', '', 'Learn about our studio', '#ffffff', true),
  ('contact', 'contact', 'Get in touch', '', 'Contact us', '#ffffff', true),
  ('shop', 'shop', 'Shop', '', 'Browse our arrangements', '#ffffff', true)
ON CONFLICT (slug) DO NOTHING;
```

## Step 4: Paste It
- Paste the code into the white text area in Supabase
- You should see all the code there

## Step 5: Run It
- Look for the **blue "Run"** button (top right of the query area)
- Click it OR press **Ctrl+Enter** (Windows) or **Cmd+Enter** (Mac)
- Wait a few seconds...

## Step 6: Check for Success
- You should see "Success" or the code executed with no errors
- ✅ If it says "Success" → The migration ran!
- ❌ If you see an error → Copy the error message and let me know

## Step 7: Refresh Your Admin Panel
- Go back to your website admin panel
- Refresh the page (F5 or Cmd+R)
- Click on the **"Pages"** tab (it should now be visible!)
- Start editing your pages!

---

## What if it didn't work?

**If you see an error message:**
1. Take a screenshot of the error
2. Send it to me and I'll help debug it

**If nothing appears to have changed:**
- Make sure you clicked the blue **Run** button
- Make sure you see "Success" at the bottom
- Try refreshing your browser (not just the page, but hard refresh: Ctrl+Shift+R)

That's it! You should now see the Pages tab in your admin panel. 🎉
