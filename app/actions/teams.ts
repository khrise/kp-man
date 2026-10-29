"use server"

import { revalidatePath } from "next/cache"
import * as db from "@/lib/db"
import { AuthorizationError, requirePermission, requireTeamPermission } from "@/lib/server/auth"
import { getPlayers } from "@/lib/db"
import { getCaptainTeamIds, setTeamCaptains } from "@/lib/team-captains"
import { Permission } from "@/lib/permissions"

export async function createTeamAction(formData: FormData) {
  await requirePermission(Permission.TeamsCreate)
  const seasonId = Number(formData.get("season_id"))
  if (Number.isNaN(seasonId)) {
    throw new Error("Invalid season id")
  }

  const teamSize = Number(formData.get("team_size"))
  if (Number.isNaN(teamSize) || teamSize < 1) {
    throw new Error("Invalid team size")
  }

  const leagueValue = (formData.get("league") as string) || null

  const data = {
    seasonId,
    name: formData.get("name") as string,
    league: leagueValue,
    teamSize,
  }

  const team = await db.createTeam(data)

  const playerIds = formData.get("player_ids") as string
  if (playerIds) {
    const parsedPlayerIds = (JSON.parse(playerIds) as Array<string | number>).map((playerId, index) => {
      const numericId = Number(playerId)
      if (Number.isNaN(numericId)) {
        throw new Error(`Invalid player id at index ${index}`)
      }
      return numericId
    })
    await db.setTeamPlayers(team.id, parsedPlayerIds)
  }

  revalidatePath("/admin/teams")
  return { success: true }
}

export async function updateTeamAction(id: string, formData: FormData) {
  await requirePermission(Permission.TeamsManage)
  const teamId = Number(id)
  if (Number.isNaN(teamId)) {
    throw new Error("Invalid team id")
  }
  const user = await requireTeamPermission(teamId, Permission.TeamsManage)
  const team = await db.getTeamById(teamId)
  if (!team) throw new Error("Team not found")

  const seasonId = Number(formData.get("season_id"))
  if (Number.isNaN(seasonId)) {
    throw new Error("Invalid season id")
  }
  if (user.role !== "admin" && seasonId !== team.seasonId) throw new AuthorizationError(403)

  const teamSize = Number(formData.get("team_size"))
  if (Number.isNaN(teamSize) || teamSize < 1) {
    throw new Error("Invalid team size")
  }

  const leagueValue = (formData.get("league") as string) || null

  const data = {
    seasonId,
    name: formData.get("name") as string,
    league: leagueValue,
    teamSize,
  }

  const playerIds = formData.get("player_ids") as string
  let roster: number[] | undefined
  if (playerIds) {
    const parsedPlayerIds = (JSON.parse(playerIds) as Array<string | number>).map((playerId, index) => {
      const numericId = Number(playerId)
      if (Number.isNaN(numericId)) {
        throw new Error(`Invalid player id at index ${index}`)
      }
      return numericId
    })
    if (user.role !== "admin") {
      const allowed = await getPlayers(await getCaptainTeamIds(user.id))
      if (parsedPlayerIds.some((playerId) => !allowed.some((player) => player.id === playerId))) {
        throw new AuthorizationError(403)
      }
    }
    roster = parsedPlayerIds
  }

  await db.updateTeam(teamId, data)
  if (roster) await db.setTeamPlayers(teamId, roster)

  revalidatePath("/admin/teams")
  return { success: true }
}

export async function updateTeamCaptainsAction(teamId: number, captainIds: number[]) {
  await requirePermission(Permission.CaptainsManage)
  await setTeamCaptains(teamId, captainIds)
  revalidatePath("/admin/teams")
  return { success: true }
}

export async function deleteTeamAction(id: string) {
  await requirePermission(Permission.TeamsDelete)
  const teamId = Number(id)
  if (Number.isNaN(teamId)) {
    throw new Error("Invalid team id")
  }

  await db.deleteTeam(teamId)
  revalidatePath("/admin/teams")
  return { success: true }
}
