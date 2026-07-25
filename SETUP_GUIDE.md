# Joyful Morning Blooms - Setup Guide

This guide covers deploying to Vercel with GitHub, and setting up Google OAuth and Square Payments.

---

## PART 1: VERCEL + GITHUB DEPLOYMENT

### Step 1: Connect GitHub to Vercel

1. Go to https://vercel.com
2. Click **"New Project"**
3. Select **"Import Git Repository"**
4. Search for: `joyful-morning-blooms`
5. Select: `airshift1/joyful-morning-blooms`
6. Click **"Import"**

### Step 2: Configure Vercel Build Settings

1. **Project Name:** `joyful-morning-blooms` (leave as default)
2. **Framework Preset:** Select **"Other"** (do NOT choose a framework)
3. **Root Directory:** Leave blank
4. **Build Command:** `npm run build`
5. **Output Directory:** `.vercel/output/static`

### Step 3: Add Environment Variables to Vercel

In Vercel project settings, go to **Settings → Environment Variables** and add:

```
VITE_SUPABASE_URL = https://zxkgzkvspnmmcxkfvmgd.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable_AfHCxFGJiJ1YLw_zKxOOUQ_5WYtH_Rk
VITE_SUPABASE_PROJECT_ID = zxkgzkvspnmmcxkfvmgd
```

(These are already in your `.env` file, so Vercel will use them automatically)

### Step 4: Test Deployment

1. Make a test commit to your GitHub repo
2. Push to GitHub: `git push origin main`
3. Vercel automatically deploys
4. Check your project URL (e.g., `https://joyful-morning-blooms.vercel.app`)

---

## PART 2: GOOGLE OAUTH SETUP

### Prerequisites
- Google Cloud account
- Your Vercel project deployed URL

### Step 1: Create Google Cloud OAuth Credentials

1. Go to **Google Cloud Console:** https://console.cloud.google.com
2. **Create a new project:**
   - Click **"Select a Project"** (top left)
   - Click **"New Project"**
   - Name: `Joyful Morning Blooms`
   - Click **"Create"**

3. **Enable OAuth 2.0:**
   - Go to **APIs & Services → OAuth consent screen**
   - Select **"External"**
   - Fill in:
     - **App name:** `Joyful Morning Blooms`
     - **User support email:** Your email
     - **Developer contact:** Your email
   - Click **"Save and Continue"**
   - Click **"Save and Continue"** on Scopes page
   - Click **"Save and Continue"** on Test users page
   - Click **"Back to Dashboard"**

4. **Create OAuth Client ID:**
   - Go to **APIs & Services → Credentials**
   - Click **"+ Create Credentials"**
   - Select **"OAuth Client ID"**
   - Choose **"Web application"**
   - Name: `Joyful Morning Blooms Web`
   - Under **Authorized JavaScript origins**, add:
     ```
     https://joyful-morning-blooms.vercel.app
     ```
   - Under **Authorized redirect URIs**, add:
     ```
     https://zxkgzkvspnmmcxkfvmgd.supabase.co/auth/v1/callback
     ```
   - Click **"Create"**
   - Copy your **Client ID** and **Client Secret**

### Step 2: Add Google OAuth to Supabase

1. Go to **Supabase Console:** https://supabase.com
2. Select your project: `zxkgzkvspnmmcxkfvmgd`
3. Go to **Authentication → Providers**
4. Click **"Google"**
5. Toggle **"Enable"** to ON
6. Paste your Google **Client ID** in the `Client ID` field
7. Paste your Google **Client Secret** in the `Client Secret` field
8. Click **"Save"**

### Step 3: Verify Supabase URL Configuration

1. In Supabase, go to **Authentication → URL Configuration**
2. Verify **Site URL:**
   ```
   https://joyful-morning-blooms.vercel.app
   ```
3. Verify **Redirect URLs:**
   ```
   https://joyful-morning-blooms.vercel.app/**
   https://joyful-morning-blooms.vercel.app/auth/callback
   ```
4. Click **"Save"**

### Step 4: Test Google Login

1. Visit your app: `https://joyful-morning-blooms.vercel.app`
2. Click **"Sign in with Google"**
3. You should be redirected to Google login
4. After login, you should return to the app and be logged in
5. ✅ If it works, you're done!

---

## PART 3: SQUARE PAYMENTS SETUP

### Prerequisites
- Square account: https://squareup.com
- Your Vercel project URL

### Step 1: Create Square Application

1. Go to **Square Developer Dashboard:** https://developer.squareup.com
2. Log in or sign up
3. Go to **Applications**
4. Click **"+ New Application"**
5. Name: `Joyful Morning Blooms`
6. Click **"Create Application"**

### Step 2: Get Square API Keys

1. In your application, go to **Credentials**
2. Select **"Production"** (top right, if you want to accept real payments)
3. Copy your:
   - **Application ID** (Client ID)
   - **Access Token** (keep this SECRET!)
4. Go to **Settings → CORS**
5. Add your domain:
   ```
   https://joyful-morning-blooms.vercel.app
   ```
6. Click **"Save"**

### Step 3: Add Square Keys to Environment Variables

In Vercel (**Settings → Environment Variables**), add:

```
VITE_SQUARE_APP_ID = YOUR_SQUARE_APPLICATION_ID_HERE
VITE_SQUARE_LOCATION_ID = YOUR_SQUARE_LOCATION_ID_HERE
```

⚠️ **IMPORTANT:** Do NOT commit your access token or private keys to GitHub!

### Step 4: Install Square Web Payments SDK

This is already included in your `package.json`:

```json
"@square/web-payments-sdk": "latest"
```

If missing, run:
```bash
npm install @square/web-payments-sdk
```

### Step 5: Create Checkout Component

Create a new file: `src/components/square-checkout.tsx`

```typescript
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SquareCheckout({ amount, orderId }: { amount: number; orderId: string }) {
  const [web, setWeb] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const loadSquare = async () => {
      const { Web } = await import("@square/web-payments-sdk");
      setWeb(Web);
    };
    loadSquare();
  }, []);

  const handleCheckout = async () => {
    if (!web) {
      toast.error("Payment system loading...");
      return;
    }

    setProcessing(true);
    try {
      // Initialize payment request
      const paymentRequest = web.payments(
        import.meta.env.VITE_SQUARE_APP_ID
      ).paymentRequest({
        countryCode: "US",
        currencyCode: "USD",
        total: {
          amount: (amount * 100).toString(),
          label: "Total",
          pending: false,
        },
      });

      const paymentRequestButton = await paymentRequest.googlePay();
      await paymentRequestButton.attach("#google-pay-button");
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Payment initialization failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-2xl font-bold">${amount.toFixed(2)}</div>
      <Button
        onClick={handleCheckout}
        disabled={processing}
        className="w-full"
      >
        {processing ? "Processing..." : "Pay with Square"}
      </Button>
      <div id="google-pay-button" />
    </div>
  );
}
```

### Step 6: Test Square Payments

1. Go to **Square Dashboard → Test Data**
2. Use test card: `4532 0151 1111 1114`
3. Expiry: Any future date
4. CVV: Any 3 digits
5. Zip: Any 5 digits

---

## PART 4: DATABASE SETUP FOR ORDERS & PAYMENTS

Run these SQL queries in **Supabase SQL Editor** to create the tables:

```sql
-- Users table (auto-created by Supabase Auth)
-- Just make sure it has these fields for your app

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  status TEXT DEFAULT 'pending', -- pending, paid, shipped, delivered
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT, -- 'square', 'in_person'
  square_payment_id TEXT,
  delivery_date DATE,
  notes TEXT,
  address JSONB,
  phone VARCHAR(20)
);

-- Order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );
```

---

## PART 5: VERIFY EVERYTHING WORKS

### Checklist

- [ ] Vercel deployment is live and loads without errors
- [ ] Google Login button appears on `/auth`
- [ ] Click Google Login → Google opens → Login → Returns to app → Logged in ✅
- [ ] Can see Account page after login
- [ ] Can view order history (if orders exist)
- [ ] Environment variables are set in Vercel

### Common Issues & Fixes

**Issue: "Cannot find package 'tslib'"**
- Fix: Already handled in commit

**Issue: Google login gives 404**
- Fix: Verify `/auth/callback` route exists (already added)
- Check Supabase redirect URLs include `https://joyful-morning-blooms.vercel.app/auth/callback`

**Issue: Google login doesn't work at all**
- Wait 5 minutes for Google OAuth settings to propagate
- Check Google Cloud Console has correct redirect URI
- Verify Supabase Google OAuth is enabled

**Issue: Square payment button doesn't appear**
- Check `VITE_SQUARE_APP_ID` is in Vercel environment variables
- Make sure you're using Sandbox mode for testing

---

## PART 6: NEXT STEPS

### To Add Square Payments to Checkout:

1. Create a checkout page: `src/routes/checkout.tsx`
2. Import `SquareCheckout` component
3. Call Square API to create payment after user confirms
4. Store order in Supabase `orders` table
5. Show order confirmation

### To Add Admin Panel:

Create `src/routes/admin.tsx` with:
- Product management (add/edit/delete)
- Order management (view/update status)
- Review moderation
- Payment reporting

---

## NEED HELP?

### Useful Links
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Google OAuth: https://developers.google.com/identity
- Square Docs: https://developer.squareup.com/docs

### Commands to Deploy

```bash
# After making changes
git add .
git commit -m "Your message here"
git push origin main

# Vercel will automatically deploy!
```

Done! Your app is now ready for production. 🚀
