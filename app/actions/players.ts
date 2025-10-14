"use server"

import { revalidatePath } from "next/cache"
import * as db from "@/lib/db"

export async function getPlayers() {
  return await db.getPlayers()
}

export async function createPlayerAction(formData: FormData) {
  const data = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    email: formData.get("email") as string,
  }

  await db.createPlayer(data)
  revalidatePath("/admin/players")
  return { success: true }
}

export async function updatePlayerAction(id: string, formData: FormData) {
  const data = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    email: formData.get("email") as string,
  }

  await db.updatePlayer(id, data)
  revalidatePath("/admin/players")
  return { success: true }
}

export async function deletePlayerAction(id: string) {
  await db.deletePlayer(id)
  revalidatePath("/admin/players")
  return { success: true }
}
