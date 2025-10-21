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
