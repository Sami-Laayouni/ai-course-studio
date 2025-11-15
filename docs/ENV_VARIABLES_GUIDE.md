# Environment Variables Guide

## Required for Curriculum System

### Google Cloud Credentials (for AI & Storage)

You need these **3 environment variables** in your `.env.local` file:

```env
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

### How to Get These Values

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select your project** (or create one)
3. **Go to IAM & Admin > Service Accounts**
4. **Create a service account** (or use existing)
5. **Click on the service account** > **Keys tab** > **Add Key** > **Create new key** > **JSON**
6. **Download the JSON file**

The JSON file looks like this:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@project.iam.gserviceaccount.com",
  ...
}
```

7. **Extract the values**:
   - `GOOGLE_PROJECT_ID` = `project_id` from JSON
   - `GOOGLE_CLIENT_EMAIL` = `client_email` from JSON
   - `GOOGLE_PRIVATE_KEY` = `private_key` from JSON (keep the quotes and \n)

### Important: Private Key Format

The `GOOGLE_PRIVATE_KEY` must be in this exact format in your `.env.local`:

```env
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**Key points:**
- Must be wrapped in quotes `"..."` 
- Must include `\n` for newlines (not actual newlines)
- Must have `-----BEGIN PRIVATE KEY-----` at start
- Must have `-----END PRIVATE KEY-----` at end

### Other Required Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Cloud Storage
GOOGLE_CLOUD_BUCKET_NAME=your-bucket-name

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Cron Secret
CRON_SECRET=your-secret-token
```

## Troubleshooting

### "Missing Google Cloud credentials"
- Check that all 3 variables are in `.env.local`
- Restart your dev server after adding variables
- Make sure there are no typos in variable names

### "Invalid private key format"
- Make sure the private key is wrapped in quotes
- Make sure it includes `\n` for newlines
- Make sure it has BEGIN/END markers

### "Decoder error: unsupported"
- Usually means the private key format is wrong
- Check that you copied the entire key including BEGIN/END markers
- Make sure you're using `\n` not actual line breaks

