"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Client-side callback page that redirects to server-side API route
 * This ensures proper handling of email confirmations using token_hash
 * and prevents code verifier errors in production
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Redirect to server-side API route handler
    // This ensures proper handling of email confirmations with token_hash
    // and prevents the "both auth code and code verifier should be non-empty" error
    const currentUrl = new URL(window.location.href);
    const apiUrl = new URL('/api/auth/callback', window.location.origin);
    
    // Copy all query parameters and hash fragment to API route
    currentUrl.searchParams.forEach((value, key) => {
      apiUrl.searchParams.set(key, value);
    });
    
    // Handle hash fragment (common for OAuth flows)
    if (currentUrl.hash) {
      const hashParams = new URLSearchParams(currentUrl.hash.substring(1));
      hashParams.forEach((value, key) => {
        // Only add if not already in query params
        if (!apiUrl.searchParams.has(key)) {
          apiUrl.searchParams.set(key, value);
        }
      });
    }
    
    // Redirect to server-side handler
    window.location.href = apiUrl.toString();
  }, [router, searchParams]);

  // Show loading state while redirecting
  return (
    <div className="flex min-h-svh w-full items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Verifying your email...</p>
      </div>
    </div>
  );
}

