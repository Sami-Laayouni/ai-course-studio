# Fix: Invalid API Key Error

## Problem

You're getting this error:

```
Invalid API key
Double check your Supabase `anon` or `service_role` API key.
```

## Solution

### Step 1: Get Your Service Role Key

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Scroll down to find the **service_role** key (NOT the anon key)
5. Copy the **service_role** key (it starts with `eyJ`)

### Step 2: Set Environment Variable

#### For Local Development (.env.local):

Create or update `.env.local` in your project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**IMPORTANT**:

- Use the **service_role** key, NOT the anon key
- The service_role key starts with `eyJ` (it's a JWT token)
- Never commit `.env.local` to git

#### For Production (Vercel):

1. Go to your **Vercel Dashboard**: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add or update:
   - **Key**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: Your service_role key from Supabase
   - **Environment**: Production, Preview, Development (select all)
5. Click **Save**
6. **Redeploy** your application (Vercel → Deployments → Redeploy)

### Step 3: Verify the Key

The service_role key should:

- Start with `eyJ` (it's a JWT token)
- Be different from your anon key
- Be much longer than the anon key
- Be found in Supabase Dashboard → Settings → API → **service_role** (not anon public)

### Common Mistakes:

❌ **WRONG**: Using the anon key as the service role key
✅ **CORRECT**: Using the service_role key (found in Supabase Dashboard → Settings → API)

❌ **WRONG**: Not setting the variable in Vercel
✅ **CORRECT**: Setting it in both `.env.local` (local) and Vercel (production)

❌ **WRONG**: Using the wrong environment variable name
✅ **CORRECT**: Using exactly `SUPABASE_SERVICE_ROLE_KEY` (case-sensitive)

## After Setting the Key:

1. **Restart your local dev server** (if testing locally)
2. **Redeploy on Vercel** (if fixing production)
3. **Try signing up again**

The profile creation should now work!
