import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { TeamsClient } from "./teams-client"
import * as db from "@/lib/db"
import { requireAdminPage } from "@/lib/server/auth"
import { Permission } from "@/lib/permissions"
import { getCaptainOptions, getCaptainTeamIds, getTeamCaptains } from "@/lib/team-captains"
import { ManagementProvider } from "@/components/management-provider"

// Force dynamic rendering for admin pages
export const dynamic = 'force-dynamic'

export default async function TeamsPage() {
  const user = await requireAdminPage(Permission.ManagementAccess)
  const teamIds = user.role === "admin" ? undefined : await getCaptainTeamIds(user.id)
  const [teams, seasons, players, currentSeason] = await Promise.all([
    db.getTeams(teamIds),
    db.getSeasons(teamIds),
    db.getPlayers(teamIds),
    db.getCurrentSeason(),
  ])

  const teamsWithPlayers = await Promise.all(
    teams.map(async (team) => {
      const teamPlayers = await db.getTeamPlayers(team.id)
      return {
        ...team,
        captains: await getTeamCaptains(team.id),
        players: teamPlayers.map((player) => ({
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          playerRank: player.playerRank,
        })),
      }
    }),
  )

  return (
    <ManagementProvider role={user.role}><AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <main className="mx-auto max-w-7xl px-6 py-8">
          <TeamsClient
            initialTeams={teamsWithPlayers}
            seasons={seasons}
            players={players}
            currentSeasonId={currentSeason && seasons.some((season) => season.id === currentSeason.id) ? currentSeason.id : null}
            captainOptions={user.role === "admin" ? await getCaptainOptions() : []}
          />
        </main>
      </div>
    </AuthGuard></ManagementProvider>
  )
}
