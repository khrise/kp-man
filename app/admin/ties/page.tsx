import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import * as db from "@/lib/db"
import { TiesClient } from "./ties-client"
import { requireAdminPage } from "@/lib/server/auth"
import { Permission } from "@/lib/permissions"
import { getCaptainTeamIds } from "@/lib/team-captains"
import { ManagementProvider } from "@/components/management-provider"

// Force dynamic rendering for admin pages
export const dynamic = 'force-dynamic'

export default async function TiesPage() {
    const user = await requireAdminPage(Permission.ManagementAccess)
    const teamIds = user.role === "admin" ? undefined : await getCaptainTeamIds(user.id)
    const [ties, teams, seasons, currentSeason] = await Promise.all([
      db.getTiesWithLineupInfo(teamIds),
      db.getTeams(teamIds),
      db.getSeasons(teamIds),
      db.getCurrentSeason(),
    ])

    return (
      <ManagementProvider role={user.role}><AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <AdminHeader />
          <TiesClient initialTies={ties} teams={teams} seasons={seasons} currentSeasonId={currentSeason && seasons.some((season) => season.id === currentSeason.id) ? currentSeason.id : null} />
        </div>
      </AuthGuard></ManagementProvider>
    )
}
