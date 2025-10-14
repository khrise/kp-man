"use server"

import { revalidatePath } from "next/cache"
import * as db from "@/lib/db"

export async function createSeasonAction(formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    start_date: formData.get("start_date") as string,
    end_date: formData.get("end_date") as string,
    access_code: formData.get("access_code") as string,
  }

  await db.createSeason(data)
  revalidatePath("/admin/seasons")
  return { success: true }
}

export async function updateSeasonAction(id: string, formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    start_date: formData.get("start_date") as string,
    end_date: formData.get("end_date") as string,
    access_code: formData.get("access_code") as string,
  }

  await db.updateSeason(id, data)
  revalidatePath("/admin/seasons")
  return { success: true }
}

export async function deleteSeasonAction(id: string) {
  await db.deleteSeason(id)
  revalidatePath("/admin/seasons")
  return { success: true }
}
