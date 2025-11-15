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

  // If the lineup is finalized, do not allow toggling lineup membership
  if ((tie as unknown as { isLineupReady?: boolean }).isLineupReady) {
    throw new Error("Cannot modify lineup: lineup has been finalized by admin")
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

export async function markTieReadyAction(tieId: string, ready: boolean) {
  const tieIdNum = Number(tieId)
  if (Number.isNaN(tieIdNum)) {
    throw new Error("Invalid tie ID")
  }

  const tie = await db.getTieById(tieIdNum)
  if (!tie) throw new Error("Tie not found")

  const team = await db.getTeamById(tie.teamId)
  if (!team) throw new Error("Team not found")

  // If trying to mark ready, ensure lineup is full
  if (ready) {
    const currentLineupCount = await db.getLineupCount(tieIdNum)
    if (currentLineupCount < team.teamSize) {
      throw new Error(`Cannot mark ready: only ${currentLineupCount}/${team.teamSize} selected`)
    }
  }

  await db.updateTieReady(tieIdNum, ready)

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

  // Get players without any participation response
  const playersWithoutParticipation = await db.getPlayersWithoutParticipation(tieIdNum)

  // Separate players by lineup status first, then by participation status
  const lineupPlayers = tie.participations.filter((p) => p.isInLineup)
  const nonLineupParticipations = tie.participations.filter((p) => !p.isInLineup)

  // From non-lineup players, separate confirmed (available) from others
  const availablePlayers = nonLineupParticipations.filter((p) => p.status === "confirmed")
  const otherParticipations = nonLineupParticipations.filter((p) => p.status !== "confirmed")

  return {
    tie,
    team,
    lineupPlayers,
    availablePlayers,
    otherParticipations,
    playersWithoutParticipation,
    lineupCount: lineupPlayers.length,
    maxPlayers: team.teamSize,
  }
}
