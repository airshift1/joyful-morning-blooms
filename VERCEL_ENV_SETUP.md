# Add to Vercel Environment Variables

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these variables:

## Required Variables

```
VITE_SUPABASE_URL = https://ryoqkscwtemhibcvgdul.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable_8JSae5AzaRX064hXvOF2dA_csbLsK-Y
VITE_SUPABASE_PROJECT_ID = ryoqkscwtemhibcvgdul
VITE_GOOGLE_CLIENT_ID = 872264434360-ghelts8ja2hc6u09r3v0jt517lhtk234.apps.googleusercontent.com
```

## Optional Variables (Add Later)

```
VITE_SQUARE_APP_ID = [ADD WHEN READY]
VITE_SQUARE_LOCATION_ID = [ADD WHEN READY]
```

After adding, scroll to bottom and click **"Save"**.

Vercel will automatically redeploy with the new variables.

---

## Next: Configure Google OAuth in Supabase

Go to: **Supabase → Your Project → Authentication → Providers → Google**

Make sure:
1. ✅ Enable toggle is ON
2. Client ID: `872264434360-ghelts8ja2hc6u09r3v0jt517lhtk234.apps.googleusercontent.com`
3. Client Secret: (from your Google credentials file)
4. Click Save

---

## Test Your Deployment

1. Wait for Vercel to redeploy (check Deployments page)
2. Visit: https://joyful-morning-blooms.vercel.app
3. Click "Sign in with Google"
4. Should work without 404! ✅
