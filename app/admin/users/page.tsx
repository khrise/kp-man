import { requireAdminPage } from "@/lib/server/auth"
import { Permission } from "@/lib/permissions"
import UsersClient from "./users-client"
import { ManagementProvider } from "@/components/management-provider"

export default async function UsersPage() {
  const user = await requireAdminPage(Permission.UsersManage)
  return <ManagementProvider role={user.role}><UsersClient /></ManagementProvider>
}
