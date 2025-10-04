import type React from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout requiredRole="admin">{children}</DashboardLayout>
}
