import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with service role key
 * This bypasses RLS and should ONLY be used in server-side API routes
 * NEVER expose this client to the client-side code
 */
export function createServiceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

