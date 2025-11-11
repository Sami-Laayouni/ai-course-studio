# Supabase Email Confirmation Setup Guide

## ⚠️ CRITICAL: Check These Settings in Supabase Dashboard

### 1. Enable Email Confirmation

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Settings** → **Auth**
3. Scroll down to **"Email Auth"** section
4. Make sure **"Enable email confirmations"** is **ENABLED** ✅
5. If it's disabled, enable it and save

### 2. Configure Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://ai-course-studio-g8vj.vercel.app`
3. Add these **Redirect URLs** (one per line):
   ```
   https://ai-course-studio-g8vj.vercel.app/auth/callback
   https://ai-course-studio-g8vj.vercel.app/auth/callback/**
   https://ai-course-studio-g8vj.vercel.app/**
   ```
4. Click **Save**

### 3. Check Email Templates

1. Go to **Authentication** → **Email Templates**
2. Click on **"Confirm signup"** template
3. Make sure the template includes:
   - `{{ .ConfirmationURL }}` or
   - `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup`
4. The default template should work, but verify it's not empty

### 4. Check Email Provider Settings

1. Go to **Settings** → **Auth** → **SMTP Settings**
2. If using custom SMTP, make sure it's configured correctly
3. If using Supabase's default email (limited), check if you've hit the limit
4. For production, you should use a custom SMTP provider

### 5. Test Email Sending

1. Try signing up with a real email address
2. Check the browser console for any errors
3. Check your email spam folder
4. Check Supabase logs: **Logs** → **Auth Logs** to see if emails are being sent

## Common Issues:

### Issue: Emails not being sent
- **Solution**: Check if email confirmation is enabled (Step 1)
- **Solution**: Check if you've hit the email sending limit (free tier has limits)
- **Solution**: Verify SMTP settings if using custom SMTP

### Issue: "Redirect URL not allowed" error
- **Solution**: Add the redirect URL to the whitelist (Step 2)
- **Solution**: Make sure the URL matches exactly (including https:// and no trailing slash)

### Issue: Email sent but link doesn't work
- **Solution**: Check the redirect URL is whitelisted (Step 2)
- **Solution**: Verify the callback page is handling the token correctly

## Quick Test:

1. Sign up with a test email
2. Check browser console for logs starting with "Signup response:"
3. If you see "Email confirmation required - email should be sent", the email should be sent
4. If you see "User created and session exists", email confirmation is disabled

