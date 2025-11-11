"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient();
        
        // Get tokens from both hash fragment and query parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // Check hash fragment first (most common for email confirmation)
        const hashAccessToken = hashParams.get("access_token");
        const hashRefreshToken = hashParams.get("refresh_token");
        const hashType = hashParams.get("type");
        const hashTokenHash = hashParams.get("token_hash");
        
        // Check query parameters
        const queryAccessToken = queryParams.get("access_token");
        const queryRefreshToken = queryParams.get("refresh_token");
        const queryCode = queryParams.get("code");
        const queryTokenHash = queryParams.get("token_hash");
        const queryType = queryParams.get("type");
        
        // Combine all sources
        const access_token = hashAccessToken || queryAccessToken;
        const refresh_token = hashRefreshToken || queryRefreshToken;
        const code = queryCode;
        const token_hash = hashTokenHash || queryTokenHash;
        const type = hashType || queryType || "email";

        console.log("Auth callback - URL:", window.location.href);
        console.log("Auth callback - Hash:", window.location.hash);
        console.log("Auth callback - Search:", window.location.search);
        console.log("Auth callback - Tokens found:", { access_token: !!access_token, refresh_token: !!refresh_token, code: !!code, token_hash: !!token_hash, type });

        // Handle different confirmation methods
        // Priority 1: Hash fragment tokens (most common for email confirmation)
        if (access_token && refresh_token) {
          console.log("Using access_token and refresh_token from URL");
          // Set session from tokens
          const { error: sessionError, data: sessionData } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessionError) {
            console.error("Session error:", sessionError);
            throw sessionError;
          }
          console.log("Session set successfully");
        } 
        // Priority 2: Token hash with type (OTP verification)
        else if (token_hash && type) {
          console.log("Using token_hash verification");
          // Verify OTP token
          const { error: verifyError } = await supabase.auth.verifyOtp({
            type: type as any,
            token_hash,
          });
          if (verifyError) {
            console.error("OTP verification error:", verifyError);
            throw verifyError;
          }
          console.log("OTP verified successfully");
        }
        // Priority 3: Code exchange (for OAuth flows)
        else if (code) {
          console.log("Attempting code exchange");
          try {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              console.error("Code exchange error:", exchangeError);
              throw exchangeError;
            }
            console.log("Code exchanged successfully");
          } catch (exchangeErr) {
            console.error("Code exchange failed:", exchangeErr);
            throw exchangeErr;
          }
        } else {
          // Last resort: Try to get session from Supabase's automatic handling
          // Sometimes Supabase handles the session automatically
          console.log("No explicit tokens found, checking if session exists...");
          const { data: { session }, error: sessionCheckError } = await supabase.auth.getSession();
          
          if (session && session.user) {
            console.log("Session found automatically");
            // Session exists, continue with redirect
          } else {
            // No valid token found - log everything for debugging
            console.error("No valid token found. Full URL:", window.location.href);
            console.error("Hash params:", Object.fromEntries(hashParams));
            console.error("Query params:", Object.fromEntries(queryParams));
            console.error("Session check error:", sessionCheckError);
            throw new Error("No valid confirmation token found in URL. Please check your email for the correct confirmation link.");
          }
        }

        // Get user to determine redirect
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Get user profile to determine redirect
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, has_completed_assessment")
            .eq("id", user.id)
            .single();

          const userRole = profile?.role || "student";
          const next = searchParams.get("next") || "/dashboard";

          // Redirect based on role
          if (userRole === "admin") {
            router.push("/admin");
          } else if (userRole === "teacher") {
            router.push("/dashboard");
          } else if (userRole === "student") {
            if (!profile?.has_completed_assessment) {
              router.push("/learn/assessment");
            } else {
              router.push("/learn");
            }
          } else {
            router.push(next);
          }
        } else {
          router.push("/auth/login");
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError(err instanceof Error ? err.message : "Failed to verify email");
        setTimeout(() => {
          router.push(`/auth/login?error=${encodeURIComponent(err instanceof Error ? err.message : "Failed to verify email")}`);
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return null;
}

