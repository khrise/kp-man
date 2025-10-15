"use server"

import { revalidatePath } from "next/cache"
import * as db from "@/lib/db"

export async function updateParticipationAction(
  tieId: string,
  playerId: string,
  status: "confirmed" | "maybe" | "declined",
  comment?: string | null,
) {
  const numericTieId = Number(tieId)
  if (Number.isNaN(numericTieId)) {
    throw new Error("Invalid tie id")
  }

  const numericPlayerId = Number(playerId)
  if (Number.isNaN(numericPlayerId)) {
    throw new Error("Invalid player id")
  }

  await db.upsertParticipation({
    tieId: numericTieId,
    playerId: numericPlayerId,
    status,
    comment: comment ?? null,
  })

  revalidatePath("/spieltage")
  return { success: true }
}
