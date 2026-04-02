"use server"

import { revalidatePath } from "next/cache"
import * as db from "@/lib/db"

export async function getCurrentSeasonAction() {
  const season = await db.getCurrentSeason()
  return { success: true, data: season ?? null }
}

export async function createSeasonAction(formData: FormData) {
  const isCurrent = formData.get("is_current") === "true"

  const data = {
    name: formData.get("name") as string,
    startDate: formData.get("start_date") as string,
    endDate: formData.get("end_date") as string,
    accessCode: formData.get("access_code") as string,
  }

  const season = await db.createSeason(data)

  if (isCurrent) {
    await db.setCurrentSeason(season.id)
  }

  revalidatePath("/admin/seasons")
  return { success: true }
}

export async function updateSeasonAction(id: string, formData: FormData) {
  const seasonId = Number(id)
  if (Number.isNaN(seasonId)) {
    throw new Error("Invalid season id")
  }

  const isCurrent = formData.get("is_current") === "true"

  const data = {
    name: formData.get("name") as string,
    startDate: formData.get("start_date") as string,
    endDate: formData.get("end_date") as string,
    accessCode: formData.get("access_code") as string,
  }

  await db.updateSeason(seasonId, data)

  if (isCurrent) {
    await db.setCurrentSeason(seasonId)
  }

  revalidatePath("/admin/seasons")
  return { success: true }
}

export async function deleteSeasonAction(id: string) {
  const seasonId = Number(id)
  if (Number.isNaN(seasonId)) {
    throw new Error("Invalid season id")
  }

  await db.deleteSeason(seasonId)
  revalidatePath("/admin/seasons")
  return { success: true }
}
