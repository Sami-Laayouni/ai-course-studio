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
        
        // Get the code from URL hash (Supabase uses #access_token=...)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
        const code = searchParams.get("code");
        const token_hash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        // Handle different confirmation methods
        // Priority 1: Hash fragment tokens (most common for email confirmation)
        if (access_token && refresh_token) {
          // Set session from tokens in hash fragment
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessionError) throw sessionError;
        } 
        // Priority 2: Token hash with type (OTP verification)
        else if (token_hash && type) {
          // Verify OTP token
          const { error: verifyError } = await supabase.auth.verifyOtp({
            type: type as any,
            token_hash,
          });
          if (verifyError) throw verifyError;
        }
        // Priority 3: Code exchange (requires PKCE, but email confirmation doesn't use this)
        else if (code) {
          // For email confirmation, Supabase doesn't use PKCE code exchange
          // This code path is for OAuth flows, not email confirmation
          // Try to exchange anyway, but it might fail
          try {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              // If code exchange fails, check if we have tokens in hash
              const hashParams = new URLSearchParams(window.location.hash.substring(1));
              const hashAccessToken = hashParams.get("access_token");
              const hashRefreshToken = hashParams.get("refresh_token");
              
              if (hashAccessToken && hashRefreshToken) {
                const { error: hashError } = await supabase.auth.setSession({
                  access_token: hashAccessToken,
                  refresh_token: hashRefreshToken,
                });
                if (hashError) throw hashError;
              } else {
                throw exchangeError;
              }
            }
          } catch (exchangeErr) {
            // If code exchange fails, try hash fragment as fallback
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const hashAccessToken = hashParams.get("access_token");
            const hashRefreshToken = hashParams.get("refresh_token");
            
            if (hashAccessToken && hashRefreshToken) {
              const { error: hashError } = await supabase.auth.setSession({
                access_token: hashAccessToken,
                refresh_token: hashRefreshToken,
              });
              if (hashError) throw hashError;
            } else {
              throw exchangeErr;
            }
          }
        } else {
          // No valid token found
          throw new Error("No valid confirmation token found in URL");
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

