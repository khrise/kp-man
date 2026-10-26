"use server"

import { revalidatePath } from "next/cache"
import * as db from "@/lib/db"
import { requireManagement, requirePermission, requirePlayerPermission, requireTeamPermission } from "@/lib/server/auth"
import { createPlayerForTeam, getTeamIdsByPlayer } from "@/lib/team-captains"
import { Permission } from "@/lib/permissions"

export async function getPlayersAdminList() {
  const { user, teamIds } = await requireManagement(Permission.PlayersManage)
  const players = await db.getPlayersAdminList(teamIds)
  if (user.role === "admin") return players.map((player) => ({ ...player, canEdit: true }))

  // Load all memberships (including teams outside the captain's scope) in one query
  const membershipsByPlayer = await getTeamIdsByPlayer(players.map((player) => player.id))
  return players.map((player) => {
    const memberships = membershipsByPlayer.get(player.id) ?? []
    return { ...player, canEdit: memberships.length > 0 && memberships.every((id) => teamIds?.includes(id)) }
  })
}

export async function getPlayers() {
  const { teamIds } = await requireManagement(Permission.PlayersManage)
  return await db.getPlayers(teamIds)
}

export async function createPlayerAction(formData: FormData) {
  const { user } = await requireManagement(Permission.PlayersManage)
  const data = {
    firstName: formData.get("first_name") as string,
    lastName: formData.get("last_name") as string,
  }

  if (user.role === "admin") {
    await db.createPlayer(data)
  } else {
    const teamId = Number(formData.get("team_id"))
    await requireTeamPermission(teamId, Permission.PlayersManage)
    await createPlayerForTeam(teamId, data.firstName, data.lastName)
  }
  revalidatePath("/admin/players")
  return { success: true }
}

export async function updatePlayerAction(id: string, formData: FormData) {
  await requirePermission(Permission.PlayersManage)
  const playerId = Number(id)
  if (Number.isNaN(playerId)) {
    throw new Error("Invalid player id")
  }
  await requirePlayerPermission(playerId)

  const data = {
    firstName: formData.get("first_name") as string,
    lastName: formData.get("last_name") as string,
  }

  await db.updatePlayer(playerId, data)
  revalidatePath("/admin/players")
  return { success: true }
}

export async function deletePlayerAction(id: string) {
  await requirePermission(Permission.PlayersDelete)
  const playerId = Number(id)
  if (Number.isNaN(playerId)) {
    throw new Error("Invalid player id")
  }

  await db.deletePlayer(playerId)
  revalidatePath("/admin/players")
  return { success: true }
}
