import { requireAdminPage } from "@/lib/server/auth"
import { Permission } from "@/lib/permissions"
import { ManagementProvider } from "@/components/management-provider"
import ProfileClient from "./profile-client"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const user = await requireAdminPage(Permission.ManagementAccess)
  return (
    <ManagementProvider role={user.role}>
      <ProfileClient />
    </ManagementProvider>
  )
}
