"use server"

import { revalidatePath } from "next/cache"
import * as db from "@/lib/db"
import { requireAdmin } from "@/lib/server/auth"

export async function getPlayersAdminList() {
  await requireAdmin()
  return await db.getPlayersAdminList()
}

export async function getPlayers() {
  await requireAdmin()
  return await db.getPlayers()
}

export async function createPlayerAction(formData: FormData) {
  await requireAdmin()
  const data = {
    firstName: formData.get("first_name") as string,
    lastName: formData.get("last_name") as string,
  }

  await db.createPlayer(data)
  revalidatePath("/admin/players")
  return { success: true }
}

export async function updatePlayerAction(id: string, formData: FormData) {
  await requireAdmin()
  const playerId = Number(id)
  if (Number.isNaN(playerId)) {
    throw new Error("Invalid player id")
  }

  const data = {
    firstName: formData.get("first_name") as string,
    lastName: formData.get("last_name") as string,
  }

  await db.updatePlayer(playerId, data)
  revalidatePath("/admin/players")
  return { success: true }
}

export async function deletePlayerAction(id: string) {
  await requireAdmin()
  const playerId = Number(id)
  if (Number.isNaN(playerId)) {
    throw new Error("Invalid player id")
  }

  await db.deletePlayer(playerId)
  revalidatePath("/admin/players")
  return { success: true }
}
