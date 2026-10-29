import "server-only"

import { db } from "@/lib/db"
import type { CaptainOption } from "@/lib/types"

export async function getCaptainTeamIds(userId: number): Promise<number[]> {
  const rows = await db.selectFrom("teamCaptains").select("teamId").where("userId", "=", userId).execute()
  return rows.map((row) => row.teamId)
}

export async function getCaptainOptions(): Promise<CaptainOption[]> {
  return db.selectFrom("users").select(["id", "username"]).where("role", "=", "team_captain").orderBy("username").execute()
}

export async function getTeamCaptains(teamId: number): Promise<CaptainOption[]> {
  return db.selectFrom("teamCaptains").innerJoin("users", "users.id", "teamCaptains.userId")
    .select(["users.id", "users.username"]).where("teamCaptains.teamId", "=", teamId)
    .where("users.role", "=", "team_captain").orderBy("users.username").execute()
}

export async function setTeamCaptains(teamId: number, userIds: number[]): Promise<void> {
  if (!Number.isSafeInteger(teamId) || teamId <= 0) throw new Error("Invalid team ID")
  if (!Array.isArray(userIds) || userIds.some((id) => !Number.isSafeInteger(id) || id <= 0) || new Set(userIds).size !== userIds.length) {
    throw new Error("Invalid captain IDs")
  }
  await db.transaction().execute(async (trx) => {
    await trx.selectFrom("teams").select("id").where("id", "=", teamId).forUpdate().executeTakeFirstOrThrow()
    if (userIds.length) {
      const users = await trx.selectFrom("users").select(["id", "role"])
        .where("id", "in", userIds).orderBy("id").forUpdate().execute()
      if (users.length !== userIds.length || users.some((user) => user.role !== "team_captain")) {
        throw new Error("Only team captains can be assigned")
      }
    }
    await trx.deleteFrom("teamCaptains").where("teamId", "=", teamId).execute()
    if (userIds.length) await trx.insertInto("teamCaptains").values(userIds.map((userId) => ({ teamId, userId }))).execute()
  })
}

export async function getPlayerTeamIds(playerId: number): Promise<number[]> {
  const rows = await db.selectFrom("teamPlayers").select("teamId").where("playerId", "=", playerId).execute()
  return rows.map((row) => row.teamId)
}

export async function getTeamIdsByPlayer(playerIds: number[]): Promise<Map<number, number[]>> {
  const result = new Map<number, number[]>()
  if (playerIds.length === 0) return result
  const rows = await db.selectFrom("teamPlayers").select(["playerId", "teamId"]).where("playerId", "in", playerIds).execute()
  for (const row of rows) {
    result.set(row.playerId, [...(result.get(row.playerId) ?? []), row.teamId])
  }
  return result
}

export async function createPlayerForTeam(teamId: number, firstName: string, lastName: string) {
  return db.transaction().execute(async (trx) => {
    await trx.selectFrom("teams").select("id").where("id", "=", teamId).forUpdate().executeTakeFirstOrThrow()
    const player = await trx.insertInto("players").values({ firstName, lastName }).returningAll().executeTakeFirstOrThrow()
    const rank = await trx.selectFrom("teamPlayers").select((eb) => eb.fn.max<number>("playerRank").as("rank"))
      .where("teamId", "=", teamId).executeTakeFirstOrThrow()
    await trx.insertInto("teamPlayers").values({ teamId, playerId: player.id, playerRank: Number(rank.rank ?? 0) + 1 }).execute()
    return player
  })
}
