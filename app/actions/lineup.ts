"use server"

import { revalidatePath } from "next/cache"
import * as db from "@/lib/db"

export async function toggleLineupAction(participationId: string, tieId: string) {
  const participationIdNum = Number(participationId)
  const tieIdNum = Number(tieId)

  if (Number.isNaN(participationIdNum) || Number.isNaN(tieIdNum)) {
    throw new Error("Invalid participation or tie ID")
  }

  // Get current participation
  const participation = await db.getParticipationById(participationIdNum)
  if (!participation) {
    throw new Error("Participation not found")
  }

  // Only confirmed players can be in lineup
  if (participation.status !== "confirmed") {
    throw new Error("Only confirmed players can be added to lineup")
  }

  // Get team info for the tie to check team size limit
  const tie = await db.getTieById(tieIdNum)
  if (!tie) {
    throw new Error("Tie not found")
  }

  const team = await db.getTeamById(tie.teamId)
  if (!team) {
    throw new Error("Team not found")
  }

  // If adding to lineup, check if we're at the limit
  if (!participation.isInLineup) {
    const currentLineupCount = await db.getLineupCount(tieIdNum)
    if (currentLineupCount >= team.teamSize) {
      throw new Error(`Maximum number of players (${team.teamSize}) already selected for lineup`)
    }
  }

  // Toggle lineup status
  await db.updateParticipationLineup(participationIdNum, !participation.isInLineup)

  revalidatePath(`/admin/ties/${tieId}/lineup`)
  return { success: true }
}

export async function getLineupData(tieId: string) {
  const tieIdNum = Number(tieId)
  if (Number.isNaN(tieIdNum)) {
    throw new Error("Invalid tie ID")
  }

  const tie = await db.getTieWithParticipations(tieIdNum)
  if (!tie) {
    throw new Error("Tie not found")
  }

  const team = await db.getTeamById(tie.teamId)
  if (!team) {
    throw new Error("Team not found")
  }

  // Separate confirmed players by lineup status
  const confirmedParticipations = tie.participations.filter((p) => p.status === "confirmed")
  const lineupPlayers = confirmedParticipations.filter((p) => p.isInLineup)
  const availablePlayers = confirmedParticipations.filter((p) => !p.isInLineup)
  const otherParticipations = tie.participations.filter((p) => p.status !== "confirmed")

  return {
    tie,
    team,
    lineupPlayers,
    availablePlayers,
    otherParticipations,
    lineupCount: lineupPlayers.length,
    maxPlayers: team.teamSize,
  }
}
