"use server"

import { revalidatePath } from "next/cache"
import * as db from "@/lib/db"

export async function updateParticipationAction(
  tieId: string,
  playerId: string,
  status: "confirmed" | "maybe" | "declined",
  comment?: string | null,
) {
  await db.upsertParticipation({
    tie_id: tieId,
    player_id: playerId,
    status,
    comment,
  })

  revalidatePath("/spieltage")
  return { success: true }
}
