
-- =========================================================
-- ROLES
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Anyone signed-in can read their own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins manage all profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (NEW.id, NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
          COALESCE(NEW.raw_user_meta_data->>'phone', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  -- Auto-promote known admin email
  IF NEW.email = 'darbensmosier@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- PRODUCTS
-- =========================================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  base_price_cents INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads visible products" ON public.products FOR SELECT TO anon, authenticated
  USING (is_visible = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- product sizes
CREATE TABLE public.product_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_delta_cents INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT ON public.product_sizes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_sizes TO authenticated;
GRANT ALL ON public.product_sizes TO service_role;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sizes" ON public.product_sizes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage sizes" ON public.product_sizes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- product photos
CREATE TABLE public.product_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_photos TO authenticated;
GRANT ALL ON public.product_photos TO service_role;
ALTER TABLE public.product_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read photos" ON public.product_photos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage photos" ON public.product_photos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- ORDERS
-- =========================================================
CREATE TYPE public.order_status AS ENUM ('new','accepted','completed','cancelled','rejected');
CREATE TYPE public.fulfillment_type AS ENUM ('pickup','delivery');
CREATE TYPE public.payment_method AS ENUM ('online','in_person');
CREATE TYPE public.contact_pref AS ENUM ('text','email');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES public.products(id),
  size_id UUID REFERENCES public.product_sizes(id),
  size_name TEXT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  fulfillment fulfillment_type NOT NULL,
  needed_date DATE NOT NULL,
  needed_time TIME NOT NULL,
  custom_description TEXT NOT NULL DEFAULT '',
  vase_added BOOLEAN NOT NULL DEFAULT false,
  vase_price_cents INTEGER NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL,
  contact_preference contact_pref NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  status order_status NOT NULL DEFAULT 'new',
  admin_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own orders" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- REVIEWS
-- =========================================================
CREATE TYPE public.review_status AS ENUM ('pending','approved','hidden');

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL DEFAULT '',
  photo_path TEXT,
  status review_status NOT NULL DEFAULT 'pending',
  admin_reply TEXT,
  reviewer_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read approved reviews" ON public.reviews FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create reviews" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own pending review" ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage reviews" ON public.reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- SITE SETTINGS + CONTENT (singleton-ish key/value stores)
-- =========================================================
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage settings" ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.site_content (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read content" ON public.site_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage content" ON public.site_content FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- SEED
-- =========================================================
INSERT INTO public.site_settings (key, value) VALUES
  ('features', '{
    "monthly_subscription": false,
    "online_payments": false,
    "pay_in_person": true,
    "reviews": true,
    "comments": false,
    "delivery": true,
    "pickup": true,
    "wedding_orders": true,
    "contact_form": true,
    "products": true,
    "gallery": true
  }'::jsonb),
  ('vase', '{"enabled": true, "price_cents": 300}'::jsonb),
  ('notifications', '{"email_enabled": true, "sms_enabled": false, "admin_email": "darbensmosier@gmail.com"}'::jsonb),
  ('shop', '{"name": "Petal & Stem", "tagline": "Handcrafted florals for life\u2019s moments"}'::jsonb);

INSERT INTO public.site_content (key, value) VALUES
  ('home', '{
    "hero_eyebrow": "Handcrafted florals",
    "hero_title": "Bouquets made to move you",
    "hero_subtitle": "Every arrangement is designed and hand-tied in our studio using the freshest seasonal stems.",
    "hero_cta": "Shop the collection",
    "story_title": "A small studio, big on details",
    "story_body": "We source from local growers and design each piece as if it were for our own table. Whether it\u2019s a Tuesday pick-me-up or a wedding aisle, we take the same care."
  }'::jsonb),
  ('about', '{
    "title": "Our story",
    "body": "Petal & Stem began in a sunny kitchen with one bucket of ranunculus and a dream. Today we design florals for weddings, gifts, and everyday moments \u2014 always seasonal, always by hand."
  }'::jsonb),
  ('contact', '{
    "title": "Say hello",
    "body": "Questions, custom requests, weddings \u2014 we\u2019d love to hear from you.",
    "email": "hello@petalandstem.example",
    "phone": "(555) 010-0142",
    "address": "123 Garden Lane, Anywhere, USA",
    "hours": "Tue\u2013Sat  \u00b7  10a\u20136p"
  }'::jsonb);

-- 6 starter products
INSERT INTO public.products (slug, name, description, base_price_cents, is_visible, is_featured, sort_order) VALUES
  ('small-bouquet',   'Small Bouquet',    'A dainty, hand-tied posy of seasonal blooms — perfect as a thoughtful "just because" gift.', 1000, true, true,  10),
  ('medium-bouquet',  'Medium Bouquet',   'Our most-loved everyday bouquet. Lush, textured, and beautifully balanced.',                  2000, true, true,  20),
  ('large-bouquet',   'Large Bouquet',    'A showstopping arrangement of premium seasonal stems for statement moments.',                 3500, true, false, 30),
  ('deluxe-bouquet',  'Deluxe Bouquet',   'Our most indulgent design — rare varieties, garden roses, and layered greenery.',             6500, true, false, 40),
  ('wedding-bundle',  'Wedding Bundle',   'Bridal bouquet, boutonnières, and matching centerpieces. Consulted and designed with you.',   35000, true, true,  50),
  ('custom-arrangement','Custom Arrangement','Tell us your palette, budget, and occasion — we\u2019ll design something one-of-a-kind.',    2500, true, false, 60);

INSERT INTO public.product_sizes (product_id, name, price_delta_cents, sort_order)
SELECT id, 'Standard', 0, 10 FROM public.products;
