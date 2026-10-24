import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { SeasonsClient } from "./seasons-client"
import * as db from "@/lib/db"
import { requireAdminPage } from "@/lib/server/auth"
import { Permission } from "@/lib/permissions"
import { getCaptainTeamIds } from "@/lib/team-captains"
import { ManagementProvider } from "@/components/management-provider"

export const dynamic = "force-dynamic"

export default async function SeasonsPage() {
  const user = await requireAdminPage(Permission.ManagementAccess)
  const seasons = await db.getSeasons(user.role === "admin" ? undefined : await getCaptainTeamIds(user.id))

  return (
    <ManagementProvider role={user.role}><AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <main className="mx-auto max-w-7xl px-6 py-8">
          <SeasonsClient initialSeasons={seasons} />
        </main>
      </div>
    </AuthGuard></ManagementProvider>
  )
}
