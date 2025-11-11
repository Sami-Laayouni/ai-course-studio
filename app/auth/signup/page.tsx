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

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("teacher");
  const [schoolName, setSchoolName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

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

      // If user was created successfully, create/update the profile
      if (authData.user) {
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
              setError(
                "Account created successfully! Profile setup may need attention. You can continue."
              );
            }
          } catch (apiError) {
            console.error("API profile creation error:", apiError);
            // Don't block redirect - account was created successfully
            setError(
              "Account created successfully! Profile setup may need attention. You can continue."
            );
          }
        } else {
          // Profile exists, try to update it with the provided information via API
          // (We can't update directly due to RLS, but the trigger should have set the role)
          // For now, just log - the profile exists and that's what matters
          console.log("Profile already exists, skipping update");
        }
      }

      // Always redirect to success page - account was created
      // Small delay to ensure any error messages are visible if needed
      setTimeout(() => {
        router.push("/auth/signup-success");
      }, 100);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Create Account</CardTitle>
              <CardDescription>
                Join the AI Course Authoring Studio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup}>
                <div className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Jane Smith"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="teacher@school.edu"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="schoolName">School/Organization</Label>
                    <Input
                      id="schoolName"
                      type="text"
                      placeholder="Lincoln Elementary School"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  Already have an account?{" "}
                  <Link
                    href="/auth/login"
                    className="underline underline-offset-4"
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
