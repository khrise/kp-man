"use server"

import * as db from "@/lib/db"
import { PlayerParticipationDto } from "@/lib/db"
import { PlayerBase } from "@/lib/types"

export async function validateAccessCode(accessCode: string) {
  const season = await db.getSeasonByAccessCode(accessCode)
  return season ? { valid: true, seasonId: season.id } : { valid: false, seasonId: null }
}

export async function getSeasonInfo(seasonId: string) {
  const numericSeasonId = Number(seasonId)
  if (Number.isNaN(numericSeasonId)) {
    throw new Error("Invalid season id")
  }

  return await db.getSeasonById(numericSeasonId)
}

export async function getTeamsForSeason(seasonId: string) {
  // console.log("Getting teams for season:", seasonId)
  const numericSeasonId = Number(seasonId)
  if (Number.isNaN(numericSeasonId)) {
    throw new Error("Invalid season id")
  }

  const teams = await db.getTeamsBySeasonId(numericSeasonId)
  return teams
}

export async function getTiesForSeason(seasonId: string) {
  const numericSeasonId = Number(seasonId)
  if (Number.isNaN(numericSeasonId)) {
    throw new Error("Invalid season id")
  }

  const ties = await db.getTiesBySeasonId(numericSeasonId)

  return ties
}

export async function getPlayersForSeason(seasonId: string) {
  const numericSeasonId = Number(seasonId)
  if (Number.isNaN(numericSeasonId)) {
    throw new Error("Invalid season id")
  }

  const ps = await db.getPlayersForSeason(numericSeasonId)

  // Get all teams for the season
  return ps.map((p) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName }))
}

export async function getParticipationsForPlayer(
  seasonId: number,
  playerId: number,
): Promise<PlayerParticipationDto[]> {
  const numericPlayerId = Number(playerId)
  if (Number.isNaN(numericPlayerId)) {
    throw new Error("Invalid player id")
  }

  const result = await db.getParticipationsForPlayer(seasonId, numericPlayerId)
  return result
}

export async function getParticipationsForTie(tieId: string) {
  const numericTieId = Number(tieId)
  if (Number.isNaN(numericTieId)) {
    throw new Error("Invalid tie id")
  }

  return await db.getParticipations(numericTieId)
}

export async function updateParticipation(
  tieId: string,
  playerId: string,
  status: "confirmed" | "maybe" | "declined",
  comment: string,
) {
  const numericTieId = Number(tieId)
  if (Number.isNaN(numericTieId)) {
    throw new Error("Invalid tie id")
  }

  const numericPlayerId = Number(playerId)
  if (Number.isNaN(numericPlayerId)) {
    throw new Error("Invalid player id")
  }

  console.log(
    "Updating participation for tie:",
    numericTieId,
    "player:",
    numericPlayerId,
    "status:",
    status,
    "comment:",
    comment,
  )
  return await db.upsertParticipation({
    tieId: numericTieId,
    playerId: numericPlayerId,
    status,
    comment,
  })
}
