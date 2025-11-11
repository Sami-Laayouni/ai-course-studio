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
        if (code) {
          // Exchange code for session
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (token_hash && type) {
          // Verify OTP token
          const { error: verifyError } = await supabase.auth.verifyOtp({
            type: type as any,
            token_hash,
          });
          if (verifyError) throw verifyError;
        } else if (access_token && refresh_token) {
          // Set session from tokens
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessionError) throw sessionError;
        } else {
          // No valid token found
          throw new Error("No valid confirmation token found");
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

