"use server"

import { revalidatePath } from "next/cache"
import * as db from "@/lib/db"

export async function createTieAction(formData: FormData) {
  const data = {
    season_id: formData.get("season_id") as string,
    team_id: formData.get("team_id") as string,
    opponent: formData.get("opponent") as string,
    date_time: formData.get("date_time") as string,
    location: formData.get("location") as string,
    is_home: formData.get("is_home") === "true",
  }

  await db.createTie(data)
  revalidatePath("/admin/ties")
  return { success: true }
}

export async function updateTieAction(id: string, formData: FormData) {
  const data = {
    season_id: formData.get("season_id") as string,
    team_id: formData.get("team_id") as string,
    opponent: formData.get("opponent") as string,
    date_time: formData.get("date_time") as string,
    location: formData.get("location") as string,
    is_home: formData.get("is_home") === "true",
  }

  await db.updateTie(id, data)
  revalidatePath("/admin/ties")
  return { success: true }
}

export async function deleteTieAction(id: string) {
  await db.deleteTie(id)
  revalidatePath("/admin/ties")
  return { success: true }
}
