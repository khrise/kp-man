"use server"

import * as db from "@/lib/db"

export async function validateAccessCode(accessCode: string) {
  const season = await db.getSeasonByAccessCode(accessCode)
  return season ? { valid: true, seasonId: season.id } : { valid: false, seasonId: null }
}

export async function getTiesForSeason(seasonId: string) {
  const ties = await db.getTiesBySeasonId(seasonId)

  const tiesWithTeamPlayers = await Promise.all(
    ties.map(async (tie: any) => {
      const teamPlayers = await db.getTeamPlayers(tie.team_id)
      return {
        ...tie,
        team_player_ids: teamPlayers.map((p: any) => p.id),
      }
    }),
  )

  return tiesWithTeamPlayers
}

export async function getPlayersForSeason(seasonId: string) {
  // Get all teams for the season
  const teams = await db.getTeams()
  const seasonTeams = teams.filter((t: any) => `${t.season_id}` === seasonId)

  // Get all unique players from these teams
  const playerIds = new Set<string>()
  for (const team of seasonTeams) {
    const teamPlayers = await db.getTeamPlayers(team.id)
    teamPlayers.forEach((p: any) => playerIds.add(p.id))
  }

  // Fetch full player details
  const allPlayers = await db.getPlayers()
  return allPlayers.filter((p: any) => playerIds.has(p.id))
}

export async function getParticipationsForTie(tieId: string) {
  return await db.getParticipations(tieId)
}

export async function updateParticipation(tieId: string, playerId: string, status: "confirmed" | "maybe" | "declined") {
  return await db.upsertParticipation({
    tie_id: tieId,
    player_id: playerId,
    status,
  })
}
