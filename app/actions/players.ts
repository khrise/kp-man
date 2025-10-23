"use server"

import { revalidatePath } from "next/cache"
import * as db from "@/lib/db"

export async function getPlayersAdminList() {
  return await db.getPlayersAdminList()
}

export async function getPlayers() {
  return await db.getPlayers()
}

export async function createPlayerAction(formData: FormData) {
  const data = {
    firstName: formData.get("first_name") as string,
    lastName: formData.get("last_name") as string,
  }

  await db.createPlayer(data)
  revalidatePath("/admin/players")
  return { success: true }
}

export async function updatePlayerAction(id: string, formData: FormData) {
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
  const playerId = Number(id)
  if (Number.isNaN(playerId)) {
    throw new Error("Invalid player id")
  }

  await db.deletePlayer(playerId)
  revalidatePath("/admin/players")
  return { success: true }
}
