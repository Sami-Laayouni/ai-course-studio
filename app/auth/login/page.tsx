"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      
      // Wait a moment for cookies to be set, then redirect
      // Use window.location for a full page reload to ensure cookies sync
      await new Promise((resolve) => setTimeout(resolve, 100))
      
      // Check user role and assessment status
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, has_completed_assessment")
          .eq("id", data.user.id)
          .single()
        
        const userRole = profile?.role || "student"
        
        // Redirect based on role and assessment status
        if (userRole === "admin") {
          window.location.href = "/admin"
        } else if (userRole === "teacher") {
          window.location.href = "/dashboard"
        } else if (userRole === "student") {
          // Check if student has completed assessment
          if (!profile?.has_completed_assessment) {
            window.location.href = "/learn/assessment"
          } else {
            window.location.href = "/learn"
          }
        } else {
          window.location.href = "/dashboard"
        }
      } else {
        window.location.href = "/dashboard"
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
      setIsLoading(false)
    }
  }

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
              Welcome Back
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">Sign in to continue</p>
          </div>

          <Card className="bg-gray-900/50 backdrop-blur-sm border-gray-800/50 shadow-2xl">
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-5">
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
                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border-0 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all duration-300 rounded-lg font-semibold h-11"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </div>
                <div className="mt-6 text-center text-sm text-gray-400">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/auth/signup"
                    className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
