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
  Updateable,
  sql,
} from "kysely"

type TimestampColumn = ColumnType<Date, string | Date | undefined, string | Date | undefined>
type DateColumn = ColumnType<Date, string | Date, string | Date>
type NullableStringColumn = ColumnType<string | null, string | null | undefined, string | null | undefined>

interface UsersTable {
  id: Generated<number>
  username: string
  passwordHash: string
  email: string
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
  createdAt: TimestampColumn
  updatedAt: TimestampColumn
}

interface PlayersTable {
  id: Generated<number>
  firstName: string
  lastName: string
  email: NullableStringColumn
  phone: NullableStringColumn
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
  respondedAt: TimestampColumn
  createdAt: TimestampColumn
  updatedAt: TimestampColumn
}

interface MigrationsTable {
  id: string
  filename: string
  executedAt: TimestampColumn
}

export interface Database {
  users: UsersTable
  seasons: SeasonsTable
  teams: TeamsTable
  players: PlayersTable
  teamPlayers: TeamPlayersTable
  ties: TiesTable
  participations: ParticipationsTable
  migrations: MigrationsTable
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
    if (typeof window === "undefined") {
      import("./db-init").then(({ ensureDatabaseInitialized }) => {
        ensureDatabaseInitialized().catch((error) => {
          console.error("[DB] Background initialization failed:", error)
        })
      })
    }
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

type CreateTeamInput = Pick<Insertable<TeamsTable>, "seasonId" | "name" | "league">

export async function createTeam(data: CreateTeamInput): Promise<Team> {
  const inserted = await db.insertInto("teams").values(data).returningAll().executeTakeFirst()
  if (!inserted) {
    throw new Error("Failed to create team")
  }
  return inserted
}

type UpdateTeamInput = Pick<Updateable<TeamsTable>, "seasonId" | "name" | "league">

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
  email: string | null
  createdAt: Date
  teamId: number
  playerId: number
  playerRank: number
}

export async function getTeamPlayers(teamId: number): Promise<TeamPlayerWithDetails[]> {
  return db
    .selectFrom("players as p")
    .innerJoin("teamPlayers as tp", "tp.playerId", "p.id")
    .select([
      "p.id",
      "p.firstName",
      "p.lastName",
      "p.email",
      "p.createdAt",
      "tp.teamId",
      "tp.playerId",
      "tp.playerRank",
    ])
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
  return db.selectFrom("players").selectAll().orderBy("lastName").orderBy("firstName").execute()
}

export async function getPlayerById(id: number): Promise<Player | undefined> {
  return db.selectFrom("players").selectAll().where("id", "=", id).executeTakeFirst()
}

type CreatePlayerInput = Pick<Insertable<PlayersTable>, "firstName" | "lastName" | "email">

export async function createPlayer(data: CreatePlayerInput): Promise<Player> {
  const inserted = await db.insertInto("players").values(data).returningAll().executeTakeFirst()
  if (!inserted) {
    throw new Error("Failed to create player")
  }
  return inserted
}

type UpdatePlayerInput = Pick<Updateable<PlayersTable>, "firstName" | "lastName" | "email">

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
    ])
    .orderBy("t.tieDate", "desc")
    .execute()
}

export type TieWithTeamName = {
  id: number
  teamId: number
  opponent: string
  tieDate: Date
  location: string | null
  isHome: boolean
  createdAt: Date
  teamName: string
}

export async function getTiesBySeasonId(seasonId: number): Promise<TieWithTeamName[]> {
  return db
    .selectFrom("ties as t")
    .innerJoin("teams as tm", "tm.id", "t.teamId")
    .where("tm.seasonId", "=", seasonId)
    .select(["t.id", "t.teamId", "t.opponent", "t.tieDate", "t.location", "t.isHome", "t.createdAt"])
    .select((eb) => eb.ref("tm.name").as("teamName"))
    .orderBy("t.tieDate", "asc")
    .execute()
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

export async function deleteTie(id: number) {
  await db.deleteFrom("ties").where("id", "=", id).execute()
}

export type ParticipationWithPlayer = Participation & {
  firstName: string
  lastName: string
  playerRank: number
}

export async function getParticipations(tieId: number): Promise<ParticipationWithPlayer[]> {
  return db
    .selectFrom("participations as p")
    .innerJoin("players as pl", "pl.id", "p.playerId")
    .innerJoin("ties as t", "t.id", "p.tieId")
    .innerJoin("teams as tm", "tm.id", "t.teamId")
    .innerJoin("teamPlayers as tp", (join) => join.onRef("pl.id", "=", "tp.playerId").onRef("tm.id", "=", "tp.teamId"))
    .select(["p.id", "p.tieId", "p.playerId", "p.status", "p.comment", "p.respondedAt", "p.createdAt", "p.updatedAt"])
    .select(["pl.firstName", "pl.lastName", "pl.email", "tp.playerRank"])
    .where("p.tieId", "=", tieId)
    .orderBy("p.status")
    .orderBy("pl.lastName")
    .orderBy("pl.firstName")
    .execute()
}

type UpsertParticipationInput = Pick<Insertable<ParticipationsTable>, "tieId" | "playerId" | "status" | "comment">

export async function upsertParticipation(data: UpsertParticipationInput): Promise<Participation> {
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

  return inserted
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  return db.selectFrom("users").selectAll().where("username", "=", username).executeTakeFirst()
}

export async function getUserByUsernameWithPassword(
  username: string,
): Promise<(User & { passwordHash: string }) | undefined> {
  const result = await db.selectFrom("users").selectAll().where("username", "=", username).executeTakeFirst()
  if (!result) return undefined

  return {
    id: result.id,
    username: result.username,
    email: result.email,
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
