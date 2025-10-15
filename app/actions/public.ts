"use server"

import * as db from "@/lib/db"

export async function validateAccessCode(accessCode: string) {
  const season = await db.getSeasonByAccessCode(accessCode)
  return season ? { valid: true, seasonId: season.id } : { valid: false, seasonId: null }
}

export async function getTiesForSeason(seasonId: string) {
  const numericSeasonId = Number(seasonId)
  if (Number.isNaN(numericSeasonId)) {
    throw new Error("Invalid season id")
  }

  const ties = await db.getTiesBySeasonId(numericSeasonId)

  const tiesWithTeamPlayers = await Promise.all(
    ties.map(async (tie) => {
      const teamPlayers = await db.getTeamPlayers(tie.teamId)
      return {
        ...tie,
        teamPlayerIds: teamPlayers.map((p) => p.id),
      }
    }),
  )

  return tiesWithTeamPlayers
}

export async function getPlayersForSeason(seasonId: string) {
  const numericSeasonId = Number(seasonId)
  if (Number.isNaN(numericSeasonId)) {
    throw new Error("Invalid season id")
  }

  // Get all teams for the season
  const teams = await db.getTeams()
  const seasonTeams = teams.filter((team) => team.seasonId === numericSeasonId)

  // Get all unique players from these teams
  const playerIds = new Set<number>()
  for (const team of seasonTeams) {
    const teamPlayers = await db.getTeamPlayers(team.id)
    teamPlayers.forEach((player) => playerIds.add(player.id))
  }

  // Fetch full player details
  const allPlayers = await db.getPlayers()
  return allPlayers.filter((player) => playerIds.has(player.id))
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

  return await db.upsertParticipation({
    tieId: numericTieId,
    playerId: numericPlayerId,
    status,
    comment,
  })
}
