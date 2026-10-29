"use server"

import { revalidatePath } from "next/cache"
import * as db from "@/lib/db"
import { requirePermission, requireTeamPermission } from "@/lib/server/auth"
import { Permission } from "@/lib/permissions"

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
  await requirePermission(Permission.TiesManage)
  const teamId = Number(formData.get("team_id"))
  if (Number.isNaN(teamId)) {
    throw new Error("Invalid team id")
  }
  await requireTeamPermission(teamId, Permission.TiesManage)

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
  await requirePermission(Permission.TiesManage)
  const tieId = Number(id)
  if (Number.isNaN(tieId)) {
    throw new Error("Invalid tie id")
  }
  const tie = await db.getTieById(tieId)
  if (!tie) throw new Error("Tie not found")
  await requireTeamPermission(tie.teamId, Permission.TiesManage)

  const teamId = Number(formData.get("team_id"))
  if (Number.isNaN(teamId)) {
    throw new Error("Invalid team id")
  }
  await requireTeamPermission(teamId, Permission.TiesManage)

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
  await requirePermission(Permission.TiesManage)
  const tieId = Number(id)
  if (Number.isNaN(tieId)) {
    throw new Error("Invalid tie id")
  }
  const tie = await db.getTieById(tieId)
  if (!tie) throw new Error("Tie not found")
  await requireTeamPermission(tie.teamId, Permission.TiesManage)

  await db.deleteTie(tieId)
  revalidatePath("/admin/ties")
  return { success: true }
}
