
# Petal & Stem — Flower Shop v1

## Stack
- **Lovable Cloud** (Postgres + Auth + Storage) for everything backend
- **TanStack Start** (already scaffolded) for routes and server functions
- **Resend** via Lovable's built-in email for admin order notifications
- **Elegant & editorial** design: cream/blush palette, serif display (Cormorant/Fraunces), lots of whitespace

## Auth model
- Sign up with email + password, verification code sent by email (Supabase OTP confirmation)
- One `user_roles` table with an `admin` role (never on profiles — prevents privilege escalation)
- Your account (`darbensmosier@gmail.com`) gets seeded as `admin` in a migration. You sign in normally; the app just shows admin UI when your role is admin. Later you promote your sister from the admin panel with one click.
- Password reset via email

## Public site (elegant, mobile-first)
- `/` — home: hero, featured arrangements, story teaser, CTA
- `/shop` — grid of all visible arrangements, filter/sort
- `/shop/$slug` — arrangement detail: gallery, description, price, sizes, reviews, "Order" button
- `/order/$slug` — order form (see below)
- `/about`, `/contact` — CMS-editable pages
- `/account` — signed-in: profile + past orders + order status
- `/account/orders/$id` — single order detail
- `/auth` — sign in / sign up / verify code / reset password (public)

## Order form fields (all captured, all sent to admin)
- Arrangement (preselected)
- Size (dropdown from arrangement's sizes)
- Quantity
- Pickup or delivery (only shows enabled options from settings)
- Date + time needed
- Large custom description textarea (colors, ribbon, card message, special requests)
- Add vase toggle (+configurable price, hidden if disabled)
- Payment: Pay In Person (v1). "Pay Online" appears grayed with "Coming soon" — Stripe added in follow-up
- Contact preference: Text or Email
- Full name, phone, email (prefilled from account)

## Admin dashboard (`/admin`, gated by admin role)
- **Orders inbox**: list with badges (new/accepted/completed/cancelled/rejected), detail view with every field, status buttons
- **Products**: add / edit / delete / hide / reorder. Each product has: name, slug, description (rich text), base price, sizes (name + price delta), multiple photos (upload/delete/reorder), visibility toggle, featured toggle
- **Photos**: uploaded to Cloud Storage `product-photos` bucket, drag to reorder
- **Reviews**: pending / approved / hidden lists, approve / hide / delete / reply
- **Pages**: edit home hero text, about page, contact page, footer
- **Settings**: feature toggles (subscription, online payments, pay in person, reviews, delivery, pickup, wedding orders, contact form, products, gallery), vase price, vase enabled, notification method (email / SMS / in-app only)
- **Users**: promote/demote admin (so you can hand off to your sister)

## Reviews
- Only customers who have a completed order for that arrangement can review it
- Star rating 1–5 + text + optional photo upload
- Reviews start `pending`, admin approves before public

## Database (all with RLS)
```
profiles(id, email, full_name, phone, created_at)
user_roles(id, user_id, role)                        -- 'admin' | 'user'
products(id, slug, name, description, base_price_cents, is_visible, is_featured, sort_order, created_at)
product_sizes(id, product_id, name, price_delta_cents, sort_order)
product_photos(id, product_id, storage_path, sort_order)
orders(id, user_id, product_id, size_id, quantity, fulfillment, needed_date, needed_time,
       custom_description, vase_added, vase_price_cents, payment_method, contact_preference,
       full_name, phone, email, subtotal_cents, status, admin_notes, created_at)
reviews(id, user_id, product_id, order_id, rating, body, photo_path, status, admin_reply, created_at)
site_settings(key, value_json)                       -- singleton-ish key/value
site_content(key, value_json)                        -- home hero, about, contact copy
```
Storage buckets: `product-photos` (public), `review-photos` (public).

## Notifications
- Order created → server function sends email to the admin email (via Lovable Emails, `SISTER_EMAIL` setting; defaults to your email)
- Setting in admin panel controls: email on/off, in-app inbox always on. SMS wired as toggle but marked "coming soon" until Twilio is added.

## What is NOT in v1 (follow-up)
- Comments/Q&A on products
- Monthly Flower Subscription
- Stripe online payments
- SMS via Twilio (toggle exists, disabled)

## Build order
1. Enable Lovable Cloud + provision LOVABLE_API_KEY
2. Migrations: all tables, RLS policies, storage buckets, seed admin role for your email, seed default settings/content, seed 6 starter products (Small/Medium/Large/Deluxe Bouquet, Wedding Bundle, Custom)
3. Design system in `styles.css` (cream/blush tokens, serif fonts via link tag)
4. Public site routes + shared layout with header/footer
5. Auth flow (sign up → OTP verify → signed in)
6. Order flow
7. Admin dashboard
8. Reviews
9. Email notifications template + trigger
10. Sitemap, robots, SEO metadata per route

I'll build this in one go. Approve and I'll start.
