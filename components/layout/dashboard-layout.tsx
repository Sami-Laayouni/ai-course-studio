import type React from "react"
import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/navigation/sidebar"
import { Suspense } from "react"

interface DashboardLayoutProps {
  children: React.ReactNode
  requiredRole?: "admin" | "teacher" | "student"
}

export default async function DashboardLayout({ children, requiredRole }: DashboardLayoutProps) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  const userRole = profile?.role || "student"

  // Check if user has required role
  if (requiredRole && userRole !== requiredRole) {
    if (userRole === "admin") {
      redirect("/admin")
    } else if (userRole === "teacher") {
      redirect("/dashboard")
    } else {
      redirect("/learn")
    }
  }

  return (
    <div className="flex h-screen">
      <Suspense fallback={<div className="w-64 bg-background border-r">Loading...</div>}>
        <Sidebar userRole={userRole as "admin" | "teacher" | "student"} />
      </Suspense>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
