import { AuthGuard } from "@/components/auth-guard"
import SettingsClient from "./settings-client"
import { requireAdminPage } from "@/lib/server/auth"
import { Permission } from "@/lib/permissions"
import { ManagementProvider } from "@/components/management-provider"

export default async function SettingsPage() {
  const user = await requireAdminPage(Permission.SettingsManage)
  return (
    <ManagementProvider role={user.role}>
    <AuthGuard>
      <SettingsClient />
    </AuthGuard>
    </ManagementProvider>
  )
}