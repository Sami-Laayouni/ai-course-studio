import type React from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"

export default function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout requiredRole="teacher">{children}</DashboardLayout>
}
