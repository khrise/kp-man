"use server"

import { revalidatePath } from "next/cache"
import * as db from "@/lib/db"
import { requirePermission, requireManagement } from "@/lib/server/auth"
import { Permission } from "@/lib/permissions"

export async function getCurrentSeasonAction() {
  const { teamIds } = await requireManagement()
  const season = await db.getCurrentSeason()
  if (season && teamIds) {
    const visibleSeasons = await db.getSeasons(teamIds)
    if (!visibleSeasons.some((visible) => visible.id === season.id)) return { success: true, data: null }
  }
  return { success: true, data: season ?? null }
}

export async function createSeasonAction(formData: FormData) {
  await requirePermission(Permission.SeasonsManage)
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
  await requirePermission(Permission.SeasonsManage)
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
  await requirePermission(Permission.SeasonsManage)
  const seasonId = Number(id)
  if (Number.isNaN(seasonId)) {
    throw new Error("Invalid season id")
  }

  await db.deleteSeason(seasonId)
  revalidatePath("/admin/seasons")
  return { success: true }
}
