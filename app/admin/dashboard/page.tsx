import { requireAdminPage } from "@/lib/server/auth"
import AdminDashboard from "./dashboard-client"

export default async function DashboardPage() {
  await requireAdminPage()
  return <AdminDashboard />
}
