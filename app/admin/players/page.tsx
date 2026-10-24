import { requireAdminPage } from "@/lib/server/auth"
import { Permission } from "@/lib/permissions"
import PlayersClient from "./players-client"
import { ManagementProvider } from "@/components/management-provider"
import { getCaptainTeamIds } from "@/lib/team-captains"
import { getTeams } from "@/lib/db"
import { getPlayersAdminList } from "@/app/actions/players"

export default async function PlayersPage() {
  const user = await requireAdminPage(Permission.ManagementAccess)
  const teams = await getTeams(user.role === "admin" ? undefined : await getCaptainTeamIds(user.id))
  const initialPlayers = await getPlayersAdminList()
  return <ManagementProvider role={user.role}><PlayersClient teams={teams} initialPlayers={initialPlayers} /></ManagementProvider>
}
