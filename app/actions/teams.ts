"use server"

import { revalidatePath } from "next/cache"
import * as db from "@/lib/db"

export async function createTeamAction(formData: FormData) {
  const data = {
    season_id: formData.get("season_id") as string,
    name: formData.get("name") as string,
    league: formData.get("league") as string,
  }

  const team = await db.createTeam(data)

  const playerIds = formData.get("player_ids") as string
  if (playerIds) {
    const parsedPlayerIds = JSON.parse(playerIds)
    await db.setTeamPlayers(team.id, parsedPlayerIds)
  }

  revalidatePath("/admin/teams")
  return { success: true }
}

export async function updateTeamAction(id: string, formData: FormData) {
  const data = {
    season_id: formData.get("season_id") as string,
    name: formData.get("name") as string,
    league: formData.get("league") as string,
  }

  await db.updateTeam(id, data)

  const playerIds = formData.get("player_ids") as string
  if (playerIds) {
    const parsedPlayerIds = JSON.parse(playerIds)
    await db.setTeamPlayers(id, parsedPlayerIds)
  }

  revalidatePath("/admin/teams")
  return { success: true }
}

export async function deleteTeamAction(id: string) {
  await db.deleteTeam(id)
  revalidatePath("/admin/teams")
  return { success: true }
}
