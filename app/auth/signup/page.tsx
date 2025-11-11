"use client";

import type React from "react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("teacher");
  const [schoolName, setSchoolName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!acceptedTerms) {
      setError("You must accept the Terms of Service and Privacy Policy to create an account");
      return;
    }
    
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // First, sign up the user
      // Use production URL if available, otherwise use current origin
      const redirectUrl = 
        process.env.NEXT_PUBLIC_APP_URL || 
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
        window.location.origin;
      
      console.log("Signing up user with email:", email);
      console.log("Redirect URL:", `${redirectUrl}/auth/callback?next=/dashboard`);
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${redirectUrl}/auth/callback?next=/dashboard`,
          data: {
            full_name: fullName,
            role: role,
            school_name: schoolName,
          },
        },
      });

      console.log("Signup response:", { 
        user: authData?.user ? "User created" : "No user", 
        session: authData?.session ? "Session exists" : "No session",
        error: authError?.message 
      });

      if (authError) {
        console.error("Signup error:", authError);
        throw authError;
      }

      // Check if email confirmation is required
      if (authData.user && !authData.session) {
        console.log("Email confirmation required - email should be sent");
        // Email confirmation is required, email should be sent
      } else if (authData.user && authData.session) {
        console.log("User created and session exists - email confirmation may be disabled");
        // User is already confirmed (email confirmation might be disabled)
      }

      // If user was created successfully, show success message and create/update the profile
      if (authData.user) {
        setSuccess("Account created successfully!");
        // Wait a moment for the database trigger to potentially create the profile
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check if profile already exists (might have been created by trigger)
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", authData.user.id)
          .single();

        // Only try to create/update if profile doesn't exist
        if (!existingProfile) {
          // Use API endpoint to create profile (bypasses RLS using service role)
          // Pass user_id and email since user isn't authenticated yet
          try {
            const response = await fetch("/api/auth/create-profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: authData.user.id,
                email: email,
                full_name: fullName,
                role: role,
                school_name: schoolName,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error("API profile creation failed:", errorData);
              // Don't block redirect - account was created successfully
              // Profile might be created by trigger or can be created later
            }
          } catch (apiError) {
            console.error("API profile creation error:", apiError);
            // Don't block redirect - account was created successfully
          }
        } else {
          // Profile exists, try to update it with the provided information via API
          // (We can't update directly due to RLS, but the trigger should have set the role)
          // For now, just log - the profile exists and that's what matters
          console.log("Profile already exists, skipping update");
        }
      }

      // Always redirect to success page - account was created
      // Small delay to show success message briefly before redirect
      setTimeout(() => {
        router.push("/auth/signup-success");
      }, 1500);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-svh w-full bg-black text-white flex items-center justify-center p-6 md:p-10 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_70%)]"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col gap-8">
          {/* Logo/Header */}
          <div className="text-center mb-4">
            <h1 className="text-3xl sm:text-4xl font-black mb-2 bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Create Account
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">Join Course Studio</p>
          </div>

          <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800/50 shadow-2xl">
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSignup}>
                <div className="flex flex-col gap-5">
                  <div className="grid gap-2">
                    <Label htmlFor="fullName" className="text-gray-300 text-sm font-medium">
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Jane Smith"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-gray-300 text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="teacher@school.edu"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-gray-300 text-sm font-medium">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role" className="text-gray-300 text-sm font-medium">
                      Role
                    </Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white focus:border-violet-500 focus:ring-violet-500/20">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="teacher" className="text-white focus:bg-gray-700">
                          Teacher
                        </SelectItem>
                        <SelectItem value="admin" className="text-white focus:bg-gray-700">
                          Administrator
                        </SelectItem>
                        <SelectItem value="student" className="text-white focus:bg-gray-700">
                          Student
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="schoolName" className="text-gray-300 text-sm font-medium">
                      School/Organization
                    </Label>
                    <Input
                      id="schoolName"
                      type="text"
                      placeholder="Lincoln Elementary School"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20"
                    />
                  </div>
                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}
                  {success && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-sm text-green-400">{success}</p>
                    </div>
                  )}
                  <div className="flex items-start gap-2 space-y-0">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                      className="mt-1"
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm text-gray-400 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      I agree to the{" "}
                      <Link
                        href="/terms"
                        target="_blank"
                        className="text-violet-400 hover:text-violet-300 underline"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        target="_blank"
                        className="text-violet-400 hover:text-violet-300 underline"
                      >
                        Privacy Policy
                      </Link>
                    </label>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border-0 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all duration-300 rounded-lg font-semibold h-11"
                    disabled={isLoading || !acceptedTerms}
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </div>
                <div className="mt-6 text-center text-sm text-gray-400">
                  Already have an account?{" "}
                  <Link
                    href="/auth/login"
                    className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
                  >
                    Sign in
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
