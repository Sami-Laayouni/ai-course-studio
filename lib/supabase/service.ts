import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service role client for server-side operations that need to bypass RLS
 * Use this ONLY in API routes, never expose to client
 */
export function createServiceClient() {
  const rawUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  const supabaseUrl = rawUrl.trim();
  const supabaseServiceKey = rawServiceKey
    .trim()
    .replace(/\\n/g, "")
    .replace(/\s+/g, "");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase environment variables for service client"
    );
  }

  if (!supabaseServiceKey.startsWith("eyJ")) {
    console.warn(
      "Supabase service role key does not appear to be a valid JWT. Double-check SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
