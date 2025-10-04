# Environment Variables Setup

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI Configuration (if using AI features)
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

## Key Differences:

### NEXT_PUBLIC_SUPABASE_ANON_KEY

- **Used for**: Client-side operations (browser)
- **Security**: Safe to expose in browser
- **Access**: Limited by Row Level Security (RLS) policies
- **Purpose**: User authentication and data access based on user permissions

### SUPABASE_SERVICE_ROLE_KEY

- **Used for**: Server-side operations (API routes)
- **Security**: Must be kept secret, never expose in browser
- **Access**: Bypasses RLS policies, full database access
- **Purpose**: Administrative operations, data management, system tasks

## How to Get These Keys:

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

## Security Notes:

- Never commit `.env.local` to version control
- The service role key has full database access - keep it secure
- The anon key is safe to use in client-side code
- Always use RLS policies to control data access
