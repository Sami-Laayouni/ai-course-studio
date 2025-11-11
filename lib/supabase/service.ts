import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with service role key
 * This bypasses RLS and should ONLY be used in server-side API routes
 * NEVER expose this client to the client-side code
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }
  
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Please set this in your .env.local file or Vercel environment variables.");
  }

  // Validate that the service role key looks correct (starts with 'eyJ' for JWT)
  if (!serviceRoleKey.startsWith('eyJ')) {
    console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY doesn't look like a valid JWT token. Make sure you're using the service_role key, not the anon key.");
  }

  return createSupabaseClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

