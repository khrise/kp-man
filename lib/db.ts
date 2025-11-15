// Load environment variables for standalone scripts
if (typeof window === "undefined" && !process.env.NEXT_RUNTIME) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("dotenv").config({ path: ".env.local" })
  } catch {
    // dotenv might not be available, which is fine for Next.js runtime
  }
}

import { Pool } from "@neondatabase/serverless"
import {
  CamelCasePlugin,
  ColumnType,
  Generated,
  Insertable,
  Kysely,
  PostgresDialect,
  Selectable,
  sql,
  Updateable,
} from "kysely"
import type { PlayerAdminListItem, TieWithDetails } from "./types"

type TimestampColumn = ColumnType<Date, string | Date | undefined, string | Date | undefined>
type DateColumn = ColumnType<Date, string | Date, string | Date>
type NullableStringColumn = ColumnType<string | null, string | null | undefined, string | null | undefined>

interface UsersTable {
  id: Generated<number>
  username: string
  passwordHash: string
  email: string
  role: "admin" | "user" | "team_captain" | "player"
  playerId: number | null
  createdAt: TimestampColumn
  updatedAt: TimestampColumn
}

interface SeasonsTable {
  id: Generated<number>
  name: string
  startDate: DateColumn
  endDate: DateColumn
  accessCode: string
  isActive: ColumnType<boolean, boolean | undefined, boolean | undefined>
  createdAt: TimestampColumn
  updatedAt: TimestampColumn
}

interface TeamsTable {
  id: Generated<number>
  seasonId: number
  name: string
  league: NullableStringColumn
  teamSize: number
  createdAt: TimestampColumn
  updatedAt: TimestampColumn
}

interface PlayersTable {
  id: Generated<number>
  firstName: string
  lastName: string
  createdAt: TimestampColumn
  updatedAt: TimestampColumn
}

interface TeamPlayersTable {
  id: Generated<number>
  teamId: number
  playerId: number
  playerRank: number
  createdAt: TimestampColumn
  updatedAt: TimestampColumn
}

interface TiesTable {
  id: Generated<number>
  teamId: number
  opponent: string
  tieDate: DateColumn
  location: NullableStringColumn
  isHome: ColumnType<boolean, boolean | undefined, boolean | undefined>
  isLineupReady: ColumnType<boolean, boolean | undefined, boolean | undefined>
  notes: NullableStringColumn
  createdAt: TimestampColumn
  updatedAt: TimestampColumn
}

interface ParticipationsTable {
  id: Generated<number>
  tieId: number
  playerId: number
  status: "confirmed" | "maybe" | "declined"
  comment: NullableStringColumn
  isInLineup: Generated<boolean>
  respondedAt: TimestampColumn
  createdAt: TimestampColumn
  updatedAt: TimestampColumn
}

interface ParticipationAuditTable {
  id: Generated<number>
  participationId: number | null
  playerId: number
  tieId: number
  previousStatus: string | null
  newStatus: string
  previousComment: string | null
  newComment: string | null
  previousIsInLineup: ColumnType<boolean | null, boolean | null | undefined, boolean | null | undefined>
  newIsInLineup: ColumnType<boolean | null, boolean | null | undefined, boolean | null | undefined>
  changedBy: string | null
  createdAt: TimestampColumn
}

interface MigrationsTable {
  id: string
  filename: string
  executedAt: TimestampColumn
}

interface AppSettingsTable {
  id: Generated<number>
  key: string
  value: string
  type: "string" | "boolean" | "number" | "json"
  description: NullableStringColumn
  createdAt: TimestampColumn
  updatedAt: TimestampColumn
}

export interface Database {
  users: UsersTable
  seasons: SeasonsTable
  teams: TeamsTable
  players: PlayersTable
  teamPlayers: TeamPlayersTable
  ties: TiesTable
  participations: ParticipationsTable
  participation_audit: ParticipationAuditTable
  migrations: MigrationsTable
  app_settings: AppSettingsTable
}

const globalForDb = globalThis as unknown as {
  db?: Kysely<Database>
}

function createDatabase(): Kysely<Database> {
  console.log("[DB] Creating database connection...")

  if (!process.env.DATABASE_URL) {
    console.error("[DB] DATABASE_URL is not set")
    throw new Error("DATABASE_URL is not set")
  }

  // Validate DATABASE_URL format
  try {
    const url = new URL(process.env.DATABASE_URL)
    console.log("[DB] DATABASE_URL is valid, protocol:", url.protocol)
  } catch (error) {
    console.error("[DB] Invalid DATABASE_URL format:", process.env.DATABASE_URL, error)
    throw new Error(`Invalid DATABASE_URL format: ${error}`)
  }

  try {
    console.log("[DB] Creating Kysely instance...")
    const db = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString: process.env.DATABASE_URL,
        }),
      }),
      plugins: [new CamelCasePlugin()],
    })
    console.log("[DB] Database connection created successfully")
    return db
  } catch (error) {
    console.error("[DB] Failed to create database connection:", error)
    throw error
  }
}

function getDb(): Kysely<Database> {
  if (!globalForDb.db) {
    globalForDb.db = createDatabase()

    // Initialize database in the background (don't await to avoid blocking)
    // if (typeof window === "undefined") {
    //   import("./db-init").then(({ ensureDatabaseInitialized }) => {
    //     ensureDatabaseInitialized().catch((error) => {
    //       console.error("[DB] Background initialization failed:", error)
    //     })
    //   })
    // }
  }
  return globalForDb.db
}

export const db = new Proxy({} as Kysely<Database>, {
  get(target, prop, receiver) {
    const dbInstance = getDb()
    const value = Reflect.get(dbInstance, prop, receiver)
    if (typeof value === "function") {
      return value.bind(dbInstance)
    }
    return value
  },
})

export type User = Selectable<UsersTable>
export type Season = Selectable<SeasonsTable>
export type NewSeason = Insertable<SeasonsTable>
export type UpdateSeason = Updateable<SeasonsTable>

export type Team = Selectable<TeamsTable>
export type NewTeam = Insertable<TeamsTable>
export type UpdateTeam = Updateable<TeamsTable>

export type Player = Selectable<PlayersTable>
export type NewPlayer = Insertable<PlayersTable>
export type UpdatePlayer = Updateable<PlayersTable>

export type Tie = Selectable<TiesTable>
export type NewTie = Insertable<TiesTable>
export type UpdateTie = Updateable<TiesTable>

export type Participation = Selectable<ParticipationsTable>
export type NewParticipation = Insertable<ParticipationsTable>
export type UpdateParticipation = Updateable<ParticipationsTable>

export type ParticipationAudit = Selectable<ParticipationAuditTable>
export type NewParticipationAudit = Insertable<ParticipationAuditTable>

export type Migration = Selectable<MigrationsTable>
export type NewMigration = Insertable<MigrationsTable>

export async function getSeasons(): Promise<Season[]> {
  const result = await db.selectFrom("seasons").selectAll().orderBy("startDate", "desc").execute()
  return result
}

export async function getSeasonById(id: number): Promise<Season | undefined> {
  return db.selectFrom("seasons").selectAll().where("id", "=", id).executeTakeFirst()
}

export async function getSeasonByAccessCode(accessCode: string): Promise<Season | undefined> {
  return db.selectFrom("seasons").selectAll().where("accessCode", "=", accessCode).executeTakeFirst()
}

type CreateSeasonInput = Pick<Insertable<SeasonsTable>, "name" | "startDate" | "endDate" | "accessCode" | "isActive">

export async function createSeason(data: CreateSeasonInput): Promise<Season> {
  const inserted = await db.insertInto("seasons").values(data).returningAll().executeTakeFirst()
  if (!inserted) {
    throw new Error("Failed to create season")
  }
  return inserted
}

type UpdateSeasonInput = Pick<Updateable<SeasonsTable>, "name" | "startDate" | "endDate" | "accessCode" | "isActive">

export async function updateSeason(id: number, data: UpdateSeasonInput): Promise<Season | undefined> {
  return db.updateTable("seasons").set(data).where("id", "=", id).returningAll().executeTakeFirst()
}

export async function deleteSeason(id: number) {
  await db.deleteFrom("seasons").where("id", "=", id).execute()
}

export async function getTeams(): Promise<Team[]> {
  const result = await db.selectFrom("teams").selectAll().orderBy("name").execute()
  return result
}

export async function getTeamById(id: number): Promise<Team | undefined> {
  return db.selectFrom("teams").selectAll().where("id", "=", id).executeTakeFirst()
}

type CreateTeamInput = Pick<Insertable<TeamsTable>, "seasonId" | "name" | "league" | "teamSize">

export async function createTeam(data: CreateTeamInput): Promise<Team> {
  const inserted = await db.insertInto("teams").values(data).returningAll().executeTakeFirst()
  if (!inserted) {
    throw new Error("Failed to create team")
  }
  return inserted
}

type UpdateTeamInput = Pick<Updateable<TeamsTable>, "seasonId" | "name" | "league" | "teamSize">

export async function updateTeam(id: number, data: UpdateTeamInput): Promise<Team | undefined> {
  return db.updateTable("teams").set(data).where("id", "=", id).returningAll().executeTakeFirst()
}

export async function deleteTeam(id: number) {
  await db.deleteFrom("teams").where("id", "=", id).execute()
}

export type TeamPlayerWithDetails = {
  id: number
  firstName: string
  lastName: string
  createdAt: Date
  teamId: number
  playerId: number
  playerRank: number
}

export async function getTeamPlayers(teamId: number): Promise<TeamPlayerWithDetails[]> {
  return db
    .selectFrom("players as p")
    .innerJoin("teamPlayers as tp", "tp.playerId", "p.id")
    .select(["p.id", "p.firstName", "p.lastName", "p.createdAt", "tp.teamId", "tp.playerId", "tp.playerRank"])
    .where("tp.teamId", "=", teamId)
    .orderBy("tp.playerRank")
    .execute()
}

export async function setTeamPlayers(teamId: number, playerIds: number[]) {
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom("teamPlayers").where("teamId", "=", teamId).execute()

    if (playerIds.length === 0) {
      return
    }

    await trx
      .insertInto("teamPlayers")
      .values(
        playerIds.map((playerId, index) => ({
          teamId,
          playerId,
          playerRank: index + 1,
        })),
      )
      .execute()
  })
}

export async function getPlayers(): Promise<Player[]> {
  return db.selectFrom("players").selectAll().orderBy("firstName").orderBy("lastName").execute()
}

export async function getPlayersAdminList(): Promise<PlayerAdminListItem[]> {
  try {
    return db
      .selectFrom("players")
      .innerJoin("teamPlayers", "teamPlayers.playerId", "players.id")
      .innerJoin("teams", "teams.id", "teamPlayers.teamId")
      .leftJoin("seasons", "seasons.id", "teams.seasonId")
      .select((eb) => [
        "players.id",
        "players.lastName",
        "players.firstName",
        eb.fn
          .coalesce(
            eb.fn
              .jsonAgg(
                sql`
                jsonb_build_object(
                  'id', teams.id,
                  'name', teams.name,
                  'seasonName', seasons.name,
                  'rank', "team_players".player_rank
                )
                ORDER BY seasons.start_date ASC
              `,
              )
              .filterWhere("teams.id", "is not", null),
            sql`'[]'::json`,
          )
          .as("teams"),
      ])
      .groupBy(["players.id", "players.firstName", "players.lastName"])
      .orderBy("players.firstName")
      .orderBy("players.lastName")
      .execute() as unknown as PlayerAdminListItem[]
  } catch (error) {
    console.error("Error fetching players list:", error)
    throw error
  }
}

export async function getPlayerById(id: number): Promise<Player | undefined> {
  return db.selectFrom("players").selectAll().where("id", "=", id).executeTakeFirst()
}

type CreatePlayerInput = Pick<Insertable<PlayersTable>, "firstName" | "lastName">

export async function createPlayer(data: CreatePlayerInput): Promise<Player> {
  const inserted = await db.insertInto("players").values(data).returningAll().executeTakeFirst()
  if (!inserted) {
    throw new Error("Failed to create player")
  }
  return inserted
}

type UpdatePlayerInput = Pick<Updateable<PlayersTable>, "firstName" | "lastName">

export async function updatePlayer(id: number, data: UpdatePlayerInput): Promise<Player | undefined> {
  return db.updateTable("players").set(data).where("id", "=", id).returningAll().executeTakeFirst()
}

export async function deletePlayer(id: number) {
  await db.deleteFrom("players").where("id", "=", id).execute()
}

export type TieWithSeasonAndTeam = Tie & {
  teamName: string
  seasonName: string
  seasonId: number
}

export type TieWithLineupInfo = TieWithSeasonAndTeam & {
  teamSize: number
  lineupCount: number
  lineupPlayers: { playerRank: number; firstName: string; lastName: string; status: string }[]
  problematicCount: number
}

export async function getTies(): Promise<TieWithSeasonAndTeam[]> {
  return db
    .selectFrom("ties as t")
    .innerJoin("teams as tm", "tm.id", "t.teamId")
    .innerJoin("seasons as s", "s.id", "tm.seasonId")
    .selectAll("t")
    .select((eb) => [
      eb.ref("tm.name").as("teamName"),
      eb.ref("s.name").as("seasonName"),
      eb.ref("tm.seasonId").as("seasonId"),
  eb.ref("t.isLineupReady").as("isLineupReady"),
    ])
    .orderBy("t.tieDate", "desc")
    .execute()
}

export async function getTiesWithLineupInfo(): Promise<TieWithLineupInfo[]> {
  const ties = await getTies()

  const tiesWithLineup = await Promise.all(
    ties.map(async (tie) => {
      // Get team size
      const team = await db.selectFrom("teams").select("teamSize").where("id", "=", tie.teamId).executeTakeFirst()
      const teamSize = team?.teamSize || 0

      // Get lineup information
      const lineupParticipations = await db
        .selectFrom("participations as p")
        .innerJoin("players as pl", "pl.id", "p.playerId")
        .innerJoin("teamPlayers as tp", (join) =>
          join.onRef("tp.playerId", "=", "p.playerId").on("tp.teamId", "=", tie.teamId),
        )
        .select(["p.status", "pl.firstName", "pl.lastName", "tp.playerRank"])
        .where("p.tieId", "=", tie.id)
        .where("p.isInLineup", "=", true)
        .orderBy("tp.playerRank")
        .execute()

      const lineupCount = lineupParticipations.length
      const problematicCount = lineupParticipations.filter((p) => p.status !== "confirmed").length

      return {
        ...tie,
        teamSize,
        lineupCount,
        lineupPlayers: lineupParticipations,
        problematicCount,
      }
    }),
  )

  return tiesWithLineup
}

export type TieDto = {
  id: number
  teamId: number
  opponent: string
  tieDate: Date
  location: string | null
  isHome: boolean
  createdAt: Date
  participations: Participation[]
  isLineupReady: boolean
}

export type TeamDto = Team & {
  playerIds: number[]
}

export async function getTeamsBySeasonId(seasonId: number): Promise<TeamDto[]> {
  console.time(`[DB] Fetching teams for season ID ${seasonId}`)

  const rows = await db
    .selectFrom("teams")
    .leftJoin("teamPlayers", "teamPlayers.teamId", "teams.id")
    .select([
      "teams.id",
      "teams.name",
      "teams.seasonId",
      sql`
        coalesce(
          json_agg(${sql.ref("teamPlayers.playerId")}) 
          filter (where ${sql.ref("teamPlayers.playerId")} is not null), 
          '[]'
        )
      `.as("playerIds"),
    ])
    .where("teams.seasonId", "=", seasonId)
    .groupBy(["teams.id", "teams.name", "teams.seasonId"])
    .orderBy("teams.name")
    .execute()

  console.timeEnd(`[DB] Fetching teams for season ID ${seasonId}`)

  return rows as unknown as TeamDto[]
}

export async function getTiesBySeasonId(seasonId: number): Promise<TieDto[]> {
  console.time("[DB] Fetching ties by season ID")

  const ties = await db
    .selectFrom("ties as t")
    .innerJoin("teams as tm", "tm.id", "t.teamId")
    .leftJoin("participations as p", "p.tieId", "t.id")
    .select((eb) => [
      "t.id",
      "t.teamId",
      "t.opponent",
      "t.tieDate",
      "t.location",
      "t.isHome",
      "t.createdAt",
      eb.fn
        .coalesce(eb.fn.jsonAgg(sql`to_jsonb(p)`).filterWhere("p.id", "is not", null), sql`'[]'::json`)
        .as("participations"),
  eb.ref("t.isLineupReady").as("isLineupReady"),
    ])
    .where("tm.seasonId", "=", seasonId)
    .groupBy(["t.id", "t.teamId", "t.opponent", "t.tieDate", "t.location", "t.isHome", "t.createdAt"])
  .orderBy("t.isLineupReady", "asc")
    .execute()

  console.timeEnd("[DB] Fetching ties by season ID")
  return ties as TieDto[]
}

export async function getTieById(id: number): Promise<Tie | undefined> {
  return db.selectFrom("ties").selectAll().where("id", "=", id).executeTakeFirst()
}

type CreateTieInput = Pick<Insertable<TiesTable>, "teamId" | "opponent" | "tieDate" | "location" | "isHome" | "notes">

export async function createTie(data: CreateTieInput): Promise<Tie> {
  const inserted = await db.insertInto("ties").values(data).returningAll().executeTakeFirst()
  if (!inserted) {
    throw new Error("Failed to create tie")
  }
  return inserted
}

type UpdateTieInput = Pick<Updateable<TiesTable>, "teamId" | "opponent" | "tieDate" | "location" | "isHome" | "notes">

export async function updateTie(id: number, data: UpdateTieInput): Promise<Tie | undefined> {
  return db.updateTable("ties").set(data).where("id", "=", id).returningAll().executeTakeFirst()
}

export async function updateTieReady(id: number, isLineupReady: boolean): Promise<Tie | undefined> {
  return db
    .updateTable("ties")
    .set({ isLineupReady, updatedAt: sql`now()` })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst()
}

export async function deleteTie(id: number) {
  await db.deleteFrom("ties").where("id", "=", id).execute()
}

export type ParticipationWithPlayer = Participation & {
  firstName: string
  lastName: string
  playerRank: number
}

export type PlayerParticipationDto = {
  playerId: number
  tieId: number
  status: string
  isInLineup: boolean
}

export async function getParticipationsForPlayer(
  seasonId: number,
  playerId: number,
): Promise<PlayerParticipationDto[]> {
  console.time(`[DB] Fetching participations for player ID ${playerId} in season ID ${seasonId}`)
  const query = db
    .selectFrom("participations as p")
    .where("p.playerId", "=", playerId)
    .innerJoin("ties as t", "t.id", "p.tieId")
    .innerJoin("teams as tm", "tm.id", "t.teamId")
    .where("tm.seasonId", "=", seasonId)
    .select(["p.playerId", "p.tieId", "p.status", "p.isInLineup"])
    .orderBy("t.tieDate", "asc")
  const result = await query.execute()
  console.timeEnd(`[DB] Fetching participations for player ID ${playerId} in season ID ${seasonId}`)
  return result
}
// .innerJoin("players as pl", "pl.id", "p.playerId")

export async function getParticipations(tieId: number): Promise<ParticipationWithPlayer[]> {
  return db
    .selectFrom("participations as p")
    .innerJoin("players as pl", "pl.id", "p.playerId")
    .innerJoin("ties as t", "t.id", "p.tieId")
    .innerJoin("teams as tm", "tm.id", "t.teamId")
    .innerJoin("teamPlayers as tp", (join) => join.onRef("pl.id", "=", "tp.playerId").onRef("tm.id", "=", "tp.teamId"))
    .select([
      "p.id",
      "p.tieId",
      "p.playerId",
      "p.status",
      "p.comment",
      "p.isInLineup",
      "p.respondedAt",
      "p.createdAt",
      "p.updatedAt",
    ])
    .select(["pl.firstName", "pl.lastName", "tp.playerRank"])
    .where("p.tieId", "=", tieId)
    .orderBy("p.status")
    .orderBy("pl.lastName")
    .orderBy("pl.firstName")
    .execute()
}

type UpsertParticipationInput = Pick<Insertable<ParticipationsTable>, "tieId" | "playerId" | "status" | "comment">

export async function upsertParticipation(data: UpsertParticipationInput): Promise<Participation> {
  // Read previous participation (if any) to record audit
  const previous = await db
    .selectFrom("participations")
    .selectAll()
    .where("tieId", "=", data.tieId)
    .where("playerId", "=", data.playerId)
    .executeTakeFirst()

  const inserted = await db
    .insertInto("participations")
    .values({
      ...data,
    })
    .onConflict((oc) =>
      oc.columns(["tieId", "playerId"]).doUpdateSet({
        status: data.status,
        comment: data.comment ?? null,
        updatedAt: sql`now()`,
      }),
    )
    .returningAll()
    .executeTakeFirst()

  if (!inserted) {
    throw new Error("Failed to upsert participation")
  }

  // Insert audit row capturing previous and new values
  try {
    await db.insertInto("participation_audit").values({
      participationId: previous?.id ?? inserted.id,
      playerId: Number(inserted.playerId),
      tieId: Number(inserted.tieId),
      previousStatus: previous?.status ?? null,
      newStatus: inserted.status,
      previousComment: previous?.comment ?? null,
      newComment: inserted.comment ?? null,
      previousIsInLineup: previous?.isInLineup ?? null,
      newIsInLineup: inserted.isInLineup ?? null,
      changedBy: null,
      createdAt: sql`now()`,
    }).execute()
  } catch (err) {
    console.error("Failed to insert participation audit:", err)
  }

  return inserted
}

export async function getParticipationById(id: number): Promise<Participation | undefined> {
  return db.selectFrom("participations").selectAll().where("id", "=", id).executeTakeFirst()
}

export async function updateParticipationLineup(id: number, isInLineup: boolean): Promise<Participation | undefined> {
  // Read previous participation to record audit
  const previous = await getParticipationById(id)

  const updated = await db
    .updateTable("participations")
    .set({ isInLineup, updatedAt: sql`now()` })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst()

  if (updated) {
    try {
      await db.insertInto("participation_audit").values({
        participationId: id,
        playerId: updated.playerId,
        tieId: updated.tieId,
        previousStatus: previous?.status ?? null,
        newStatus: updated.status,
        previousComment: previous?.comment ?? null,
        newComment: updated.comment ?? null,
        previousIsInLineup: previous?.isInLineup ?? null,
        newIsInLineup: updated.isInLineup ?? null,
        changedBy: null,
        createdAt: sql`now()`,
      }).execute()
    } catch (err) {
      console.error("Failed to insert participation audit:", err)
    }
  }

  return updated
}

export async function insertParticipationAudit(entry: {
  participationId?: number | null
  playerId: number
  tieId: number
  previousStatus?: string | null
  newStatus: string
  previousComment?: string | null
  newComment?: string | null
  previousIsInLineup?: boolean | null
  newIsInLineup?: boolean | null
  changedBy?: string | null
}) {
  return db.insertInto("participation_audit").values({
    participationId: entry.participationId ?? null,
    playerId: entry.playerId,
    tieId: entry.tieId,
    previousStatus: entry.previousStatus ?? null,
    newStatus: entry.newStatus,
    previousComment: entry.previousComment ?? null,
    newComment: entry.newComment ?? null,
    previousIsInLineup: entry.previousIsInLineup ?? null,
    newIsInLineup: entry.newIsInLineup ?? null,
    changedBy: entry.changedBy ?? null,
    createdAt: sql`now()`,
  }).execute()
}

export async function getParticipationAuditForTie(tieId: number, limit = 50) {
  return db
    .selectFrom("participation_audit as a")
    .leftJoin("players as p", "p.id", "a.playerId")
    .select([
      "a.id",
      "a.participationId",
      "a.playerId",
      "a.tieId",
      "a.previousStatus",
      "a.newStatus",
      "a.previousComment",
      "a.newComment",
      "a.previousIsInLineup",
      "a.newIsInLineup",
      "a.changedBy",
      "a.createdAt",
      "p.firstName as playerFirstName",
      "p.lastName as playerLastName",
    ])
    .where("a.tieId", "=", tieId)
    .orderBy("a.createdAt", "desc")
    .limit(limit)
    .execute()
}

export async function getLineupCount(tieId: number): Promise<number> {
  const result = await db
    .selectFrom("participations")
    .select((eb) => eb.fn.count<number>("id").as("count"))
    .where("tieId", "=", tieId)
    .where("isInLineup", "=", true)
    .executeTakeFirst()

  return Number(result?.count) || 0
}

export async function getTieWithParticipations(id: number): Promise<TieWithDetails | undefined> {
  const tie = await db.selectFrom("ties").selectAll().where("id", "=", id).executeTakeFirst()
  if (!tie) return undefined

  const participations = await db
    .selectFrom("participations")
    .innerJoin("players", "players.id", "participations.playerId")
    .innerJoin("ties", "ties.id", "participations.tieId")
    .innerJoin("teamPlayers", (join) =>
      join
        .onRef("teamPlayers.playerId", "=", "participations.playerId")
        .onRef("teamPlayers.teamId", "=", "ties.teamId"),
    )
    .select([
      "participations.id",
      "participations.tieId",
      "participations.playerId",
      "participations.status",
      "participations.comment",
      "participations.isInLineup",
      "participations.respondedAt",
      "participations.createdAt",
      "participations.updatedAt",
      "players.firstName",
      "players.lastName",
      "players.createdAt as playerCreatedAt",
      "players.updatedAt as playerUpdatedAt",
      "teamPlayers.playerRank",
    ])
    .where("participations.tieId", "=", id)
    .orderBy("teamPlayers.playerRank")
    .execute()

  const participationsWithPlayer = participations.map((p) => ({
    id: p.id,
    tieId: p.tieId,
    playerId: p.playerId,
    status: p.status,
    comment: p.comment,
    isInLineup: p.isInLineup,
    respondedAt: p.respondedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    player: {
      id: p.playerId,
      firstName: p.firstName,
      lastName: p.lastName,
      createdAt: p.playerCreatedAt,
      updatedAt: p.playerUpdatedAt,
      playerRank: p.playerRank,
    },
  }))

  // Count participations by status
  const confirmedCount = participationsWithPlayer.filter((p) => p.status === "confirmed").length
  const maybeCount = participationsWithPlayer.filter((p) => p.status === "maybe").length
  const declinedCount = participationsWithPlayer.filter((p) => p.status === "declined").length

  // Get team information with player IDs
  const team = await db.selectFrom("teams").selectAll().where("id", "=", tie.teamId).executeTakeFirst()
  if (!team) {
    throw new Error("Team not found")
  }

  const teamPlayers = await db
    .selectFrom("teamPlayers")
    .select("playerId")
    .where("teamId", "=", tie.teamId)
    .orderBy("playerRank")
    .execute()

  const teamWithPlayerIds = {
    ...team,
    playerIds: teamPlayers.map((tp) => tp.playerId),
  }

  return {
    ...tie,
    team: teamWithPlayerIds,
    participations: participationsWithPlayer,
    confirmedCount,
    maybeCount,
    declinedCount,
  }
}

export async function getPlayersWithoutParticipation(tieId: number): Promise<TeamPlayerWithDetails[]> {
  const tie = await db.selectFrom("ties").selectAll().where("id", "=", tieId).executeTakeFirst()
  if (!tie) return []

  return db
    .selectFrom("players as p")
    .innerJoin("teamPlayers as tp", "tp.playerId", "p.id")
    .leftJoin("participations as part", (join) => join.onRef("part.playerId", "=", "p.id").on("part.tieId", "=", tieId))
    .select(["p.id", "p.firstName", "p.lastName", "p.createdAt", "tp.teamId", "tp.playerId", "tp.playerRank"])
    .where("tp.teamId", "=", tie.teamId)
    .where("part.id", "is", null) // Only players without participation record
    .orderBy("tp.playerRank")
    .execute()
}

export async function getPlayersForSeason(seasonId: number): Promise<Player[]> {
  console.time(`[DB] Fetching players for season ID ${seasonId}`)
  const players = await db
    .selectFrom("players")
    .innerJoin("teamPlayers", "teamPlayers.playerId", "players.id")
    .innerJoin("teams", "teams.id", "teamPlayers.teamId")
    .where("teams.seasonId", "=", seasonId)
    .selectAll("players")
    .distinctOn("players.id")
    .execute()

  console.timeEnd(`[DB] Fetching players for season ID ${seasonId}`)
  return players
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  return db
    .selectFrom("users")
    .selectAll()
    .where((eb) => eb.fn("LOWER", ["username"]), "=", username.toLowerCase())
    .executeTakeFirst()
}

export async function getUserByUsernameWithPassword(
  username: string,
): Promise<(User & { passwordHash: string }) | undefined> {
  const result = await db
    .selectFrom("users")
    .selectAll()
    .where((eb) => eb.fn("LOWER", ["username"]), "=", username.toLowerCase())
    .executeTakeFirst()
  if (!result) return undefined

  return {
    id: result.id,
    username: result.username,
    email: result.email,
    role: result.role,
    playerId: result.playerId,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    passwordHash: result.passwordHash,
  }
}

export interface DashboardStats {
  totalSeasons: number
  totalTeams: number
  totalPlayers: number
  upcomingTies: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [seasonsResult, teamsResult, playersResult, upcomingTiesResult] = await Promise.all([
    db
      .selectFrom("seasons")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .executeTakeFirst(),
    db
      .selectFrom("teams")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .executeTakeFirst(),
    db
      .selectFrom("players")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .executeTakeFirst(),
    db
      .selectFrom("ties")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("tieDate", ">=", new Date())
      .executeTakeFirst(),
  ])

  return {
    totalSeasons: seasonsResult?.count ?? 0,
    totalTeams: teamsResult?.count ?? 0,
    totalPlayers: playersResult?.count ?? 0,
    upcomingTies: upcomingTiesResult?.count ?? 0,
  }
}

// User management functions
export async function getUsers(): Promise<User[]> {
  return db.selectFrom("users").selectAll().orderBy("username").execute()
}

export async function getUserById(id: number): Promise<User | undefined> {
  return db.selectFrom("users").selectAll().where("id", "=", id).executeTakeFirst()
}

type CreateUserInput = Pick<Insertable<UsersTable>, "username" | "passwordHash" | "email" | "role" | "playerId">

export async function createUser(data: CreateUserInput): Promise<User> {
  const inserted = await db.insertInto("users").values(data).returningAll().executeTakeFirst()
  if (!inserted) {
    throw new Error("Failed to create user")
  }
  return inserted
}

type UpdateUserInput = Pick<Updateable<UsersTable>, "username" | "email" | "role" | "playerId">

export async function updateUser(id: number, data: UpdateUserInput): Promise<User | undefined> {
  return db.updateTable("users").set(data).where("id", "=", id).returningAll().executeTakeFirst()
}

export async function updateUserPassword(id: number, passwordHash: string): Promise<void> {
  await db.updateTable("users").set({ passwordHash }).where("id", "=", id).execute()
}

export async function deleteUser(id: number): Promise<void> {
  await db.deleteFrom("users").where("id", "=", id).execute()
}

export type UserWithPlayer = Omit<User, "passwordHash"> & {
  playerFirstName: string | null
  playerLastName?: string | null
  playerId?: number | null
}

export async function getUsersWithPlayerInfo(): Promise<UserWithPlayer[]> {
  return db
    .selectFrom("users as u")
    .leftJoin("players as p", "p.id", "u.playerId")
    .select(["u.id", "u.username", "u.email", "u.role", "u.playerId", "u.createdAt", "u.updatedAt"])
    .select(["p.firstName as playerFirstName", "p.lastName as playerLastName", "p.id as playerId"])
    .orderBy("u.username")
    .execute()
}

// App Settings Management
export type AppSetting = Selectable<AppSettingsTable>
export type NewAppSetting = Insertable<AppSettingsTable>
export type AppSettingUpdate = Updateable<AppSettingsTable>

export async function getAllAppSettings(): Promise<AppSetting[]> {
  console.time("[DB] Fetching all app settings")
  try {
    return db.selectFrom("app_settings").selectAll().orderBy("key").execute()
  } catch (error: unknown) {
    // If table doesn't exist, return empty array (will use defaults)
    const dbError = error as { code?: string }
    if (dbError?.code === "42P01") {
      // relation does not exist
      console.warn("[DB] app_settings table does not exist, using default configuration")
      return []
    }
    throw error
  } finally {
    console.timeEnd("[DB] Fetching all app settings")
  }
}

export async function getAppSetting(key: string): Promise<AppSetting | undefined> {
  return db.selectFrom("app_settings").selectAll().where("key", "=", key).executeTakeFirst()
}

export async function setAppSetting(
  key: string,
  value: string,
  type: AppSetting["type"] = "string",
  description?: string,
): Promise<AppSetting> {
  return db
    .insertInto("app_settings")
    .values({ key, value, type, description })
    .onConflict((oc) => oc.column("key").doUpdateSet({ value, type, description }))
    .returningAll()
    .executeTakeFirstOrThrow()
}

export async function deleteAppSetting(key: string): Promise<void> {
  await db.deleteFrom("app_settings").where("key", "=", key).execute()
}
