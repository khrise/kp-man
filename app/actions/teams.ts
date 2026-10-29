"use server"

import { revalidatePath } from "next/cache"
import * as db from "@/lib/db"

async function applyCaptainIds(teamId: number, formData: FormData) {
  const captainIds = formData.get("captain_ids") as string | null
  if (captainIds === null) return

  const parsed = (JSON.parse(captainIds) as Array<string | number>).map((id) => Number(id))
  if (parsed.some((id) => Number.isNaN(id))) {
    throw new Error("Invalid captain id")
  }
  await db.setTeamCaptains(teamId, parsed)
}

export async function createTeamAction(formData: FormData) {
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

  await applyCaptainIds(team.id, formData)

  revalidatePath("/admin/teams")
  return { success: true }
}

export async function updateTeamAction(id: string, formData: FormData) {
  const teamId = Number(id)
  if (Number.isNaN(teamId)) {
    throw new Error("Invalid team id")
  }

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

  await db.updateTeam(teamId, data)

  const playerIds = formData.get("player_ids") as string
  if (playerIds) {
    const parsedPlayerIds = (JSON.parse(playerIds) as Array<string | number>).map((playerId, index) => {
      const numericId = Number(playerId)
      if (Number.isNaN(numericId)) {
        throw new Error(`Invalid player id at index ${index}`)
      }
      return numericId
    })
    await db.setTeamPlayers(teamId, parsedPlayerIds)
  }

  await applyCaptainIds(teamId, formData)

  revalidatePath("/admin/teams")
  return { success: true }
}

export async function deleteTeamAction(id: string) {
  const teamId = Number(id)
  if (Number.isNaN(teamId)) {
    throw new Error("Invalid team id")
  }

  await db.deleteTeam(teamId)
  revalidatePath("/admin/teams")
  return { success: true }
}
