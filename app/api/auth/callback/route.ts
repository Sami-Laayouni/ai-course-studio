import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Get all possible parameters from query string and hash
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const code = searchParams.get('code');
  const access_token = searchParams.get('access_token');
  const refresh_token = searchParams.get('refresh_token');
  const next = searchParams.get('next') || '/dashboard';
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  // Handle errors from Supabase
  if (error) {
    console.error('Auth callback error:', error, error_description);
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(error_description || error)}`, request.url)
    );
  }

  try {
    const supabase = await createClient();

    // Priority 1: Email confirmation using token_hash (CORRECT method)
    // Email confirmations use verifyOtp with token_hash, NOT code exchange
    if (token_hash && type) {
      console.log('Handling email confirmation with token_hash:', type);
      
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        type: type as any,
        token_hash,
      });

      if (verifyError) {
        console.error('OTP verification error:', verifyError);
        return NextResponse.redirect(
          new URL(`/auth/login?error=${encodeURIComponent(verifyError.message)}`, request.url)
        );
      }

      if (data?.user) {
        // Get user profile to determine redirect
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, has_completed_assessment')
          .eq('id', data.user.id)
          .single();

        const userRole = profile?.role || 'student';
        let redirectPath = next;

        // Redirect based on role
        if (userRole === 'admin') {
          redirectPath = '/admin';
        } else if (userRole === 'teacher') {
          redirectPath = '/dashboard';
        } else if (userRole === 'student') {
          if (!profile?.has_completed_assessment) {
            redirectPath = '/learn/assessment';
          } else {
            redirectPath = '/learn';
          }
        }

        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }
    // Priority 2: OAuth flow with tokens in URL
    else if (access_token && refresh_token) {
      console.log('Handling OAuth flow with tokens');
      
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError) {
        console.error('Session error:', sessionError);
        return NextResponse.redirect(
          new URL(`/auth/login?error=${encodeURIComponent(sessionError.message)}`, request.url)
        );
      }

      // Get user to determine redirect
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, has_completed_assessment')
          .eq('id', user.id)
          .single();

        const userRole = profile?.role || 'student';
        let redirectPath = next;

        if (userRole === 'admin') {
          redirectPath = '/admin';
        } else if (userRole === 'teacher') {
          redirectPath = '/dashboard';
        } else if (userRole === 'student') {
          if (!profile?.has_completed_assessment) {
            redirectPath = '/learn/assessment';
          } else {
            redirectPath = '/learn';
          }
        }

        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }
    // Priority 3: Code exchange (ONLY for OAuth PKCE flows, NOT email confirmation)
    // IMPORTANT: Email confirmations should NEVER reach here - they use token_hash above
    else if (code) {
      console.log('Handling OAuth PKCE flow with code');
      
      // This should only be for OAuth flows, not email confirmations
      // Email confirmations use token_hash, not code
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('Code exchange error:', exchangeError);
        return NextResponse.redirect(
          new URL(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`, request.url)
        );
      }

      // Get user to determine redirect
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, has_completed_assessment')
          .eq('id', user.id)
          .single();

        const userRole = profile?.role || 'student';
        let redirectPath = next;

        if (userRole === 'admin') {
          redirectPath = '/admin';
        } else if (userRole === 'teacher') {
          redirectPath = '/dashboard';
        } else if (userRole === 'student') {
          if (!profile?.has_completed_assessment) {
            redirectPath = '/learn/assessment';
          } else {
            redirectPath = '/learn';
          }
        }

        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }

    // No valid parameters found
    console.error('No valid auth parameters found in callback URL');
    return NextResponse.redirect(
      new URL('/auth/login?error=Invalid confirmation link', request.url)
    );
  } catch (err) {
    console.error('Auth callback error:', err);
    return NextResponse.redirect(
      new URL(
        `/auth/login?error=${encodeURIComponent(err instanceof Error ? err.message : 'Authentication failed')}`,
        request.url
      )
    );
  }
}

