"use server"

import { revalidatePath } from "next/cache"
import * as db from "@/lib/db"

function parseTieDate(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Invalid tie date")
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid tie date")
  }

  return parsed.toISOString()
}

export async function createTieAction(formData: FormData) {
  const teamId = Number(formData.get("team_id"))
  if (Number.isNaN(teamId)) {
    throw new Error("Invalid team id")
  }

  const tieDate = parseTieDate(formData.get("date_time"))
  const location = (formData.get("location") as string) || null
  const isHome = formData.get("is_home") === "true"

  const data = {
    teamId,
    opponent: formData.get("opponent") as string,
    tieDate,
    location,
    isHome,
    notes: null,
  }

  await db.createTie(data)
  revalidatePath("/admin/ties")
  return { success: true }
}

export async function updateTieAction(id: string, formData: FormData) {
  const tieId = Number(id)
  if (Number.isNaN(tieId)) {
    throw new Error("Invalid tie id")
  }

  const teamId = Number(formData.get("team_id"))
  if (Number.isNaN(teamId)) {
    throw new Error("Invalid team id")
  }

  const tieDate = parseTieDate(formData.get("date_time"))
  const location = (formData.get("location") as string) || null
  const isHome = formData.get("is_home") === "true"

  const data = {
    teamId,
    opponent: formData.get("opponent") as string,
    tieDate,
    location,
    isHome,
    notes: null,
  }

  // If the tie date changed we require explicit confirmation from the user
  // that participations for this tie may be cleared. The client should set
  // the form field "confirm_clear_participations" = "true" when the admin
  // confirmed the destructive action.
  const confirmClearFlag = formData.get("confirm_clear_participations") === "true"

  // Fetch existing tie to compare
  const existing = await db.getTieById(tieId)
  if (!existing) throw new Error("Tie not found")

  const existingIso = existing.tieDate instanceof Date ? existing.tieDate.toISOString() : new Date(existing.tieDate).toISOString()

  if (existingIso !== tieDate) {
    if (!confirmClearFlag) {
      // Signal to the client that confirmation is required.
      const err = new Error("confirm_clear_participations_required") as unknown as { code?: string }
      err.code = "CONFIRM_CLEAR_PARTICIPATIONS"
      throw err
    }

    // Admin confirmed - perform deletion and tie update in a single transaction
    try {
      await db.updateTieAndClearParticipations(tieId, data)
      revalidatePath("/admin/ties")
      return { success: true }
    } catch (e) {
      console.error("Failed to update tie and clear participations for tie", tieId, e)
      throw e
    }
  }

  await db.updateTie(tieId, data)
  revalidatePath("/admin/ties")
  return { success: true }
}

export async function deleteTieAction(id: string) {
  const tieId = Number(id)
  if (Number.isNaN(tieId)) {
    throw new Error("Invalid tie id")
  }

  await db.deleteTie(tieId)
  revalidatePath("/admin/ties")
  return { success: true }
}
