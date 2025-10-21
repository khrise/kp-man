import { AuthGuard } from "@/components/auth-guard"
import SettingsClient from "./settings-client"

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsClient />
    </AuthGuard>
  )
}