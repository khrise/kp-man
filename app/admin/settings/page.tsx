import { AuthGuard } from "@/components/auth-guard"
import SettingsClient from "./settings-client"
import { requireAdminPage } from "@/lib/server/auth"

export default async function SettingsPage() {
  await requireAdminPage()
  return (
    <AuthGuard>
      <SettingsClient />
    </AuthGuard>
  )
}