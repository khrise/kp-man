import { requireAdminPage } from "@/lib/server/auth"
import { Permission } from "@/lib/permissions"
import AdminDashboard from "./dashboard-client"
import { ManagementProvider } from "@/components/management-provider"

export default async function DashboardPage() {
  const user = await requireAdminPage(Permission.ManagementAccess)
  return <ManagementProvider role={user.role}><AdminDashboard /></ManagementProvider>
}
