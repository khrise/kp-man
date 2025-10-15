import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { TeamsClient } from "./teams-client"
import * as db from "@/lib/db"

export default async function TeamsPage() {
  const [teams, seasons, players] = await Promise.all([db.getTeams(), db.getSeasons(), db.getPlayers()])

  const teamsWithPlayers = await Promise.all(
    teams.map(async (team) => {
      const teamPlayers = await db.getTeamPlayers(team.id)
      return {
        ...team,
        players: teamPlayers.map((player) => ({
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          email: player.email,
          playerRank: player.playerRank,
        })),
      }
    }),
  )

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <main className="mx-auto max-w-7xl px-6 py-8">
          <TeamsClient initialTeams={teamsWithPlayers} seasons={seasons} players={players} />
        </main>
      </div>
    </AuthGuard>
  )
}
