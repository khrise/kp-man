import { Pool } from "pg"
import { readFileSync } from "fs"
import { join } from "path"
import { setupTestDatabase, truncateAllTables, TestDatabaseContext } from "../../../helpers/db-test-harness"
import {
  createSeason,
  createTeam,
  createPlayer,
  setTeamPlayers,
  createTie,
  upsertParticipation,
  getParticipations,
  getParticipationsForPlayer,
  getParticipationById,
  getParticipationAuditForTie,
  updateParticipationLineup,
  getLineupCount,
} from "@/lib/db"

let ctx: TestDatabaseContext

beforeAll(async () => {
  ctx = await setupTestDatabase()
})

afterAll(async () => {
  await ctx.cleanup()
})

beforeEach(async () => {
  await truncateAllTables(ctx.pool as unknown as Pool)
})

async function createTestFixture() {
  const season = await createSeason({ name: "S1", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "PART01", isActive: true })
  const team = await createTeam({ seasonId: season.id, name: "Team A", league: null, teamSize: 6 })
  const player = await createPlayer({ firstName: "Anna", lastName: "Müller" })
  await setTeamPlayers(team.id, [player.id])
  const tie = await createTie({ teamId: team.id, opponent: "Rivals", tieDate: "2024-06-15", location: null, isHome: true, notes: null })
  return { season, team, player, tie }
}

describe("upsertParticipation", () => {
  it("creates a new participation record and audits the first response", async () => {
    const { player, tie } = await createTestFixture()
    const participation = await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })
    expect(participation.id).toBeDefined()
    expect(participation.status).toBe("confirmed")
    expect(participation.comment).toBeNull()
    const audit = await getParticipationAuditForTie(tie.id)
    expect(audit).toEqual([
      expect.objectContaining({
        participationId: participation.id,
        playerId: player.id,
        tieId: tie.id,
        previousStatus: null,
        newStatus: "confirmed",
        previousComment: null,
        newComment: null,
        previousIsInLineup: null,
        newIsInLineup: null,
      }),
    ])
  })

  it("updates status on second call (upsert behaviour)", async () => {
    const { player, tie } = await createTestFixture()
    await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })
    const updated = await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "declined", comment: "injured" })
    expect(updated.status).toBe("declined")
    expect(updated.comment).toBe("injured")
    const audit = await getParticipationAuditForTie(tie.id)
    expect(audit).toHaveLength(2)
    expect(audit).toEqual(expect.arrayContaining([
      expect.objectContaining({
        participationId: updated.id,
        previousStatus: null,
        newStatus: "confirmed",
      }),
      expect.objectContaining({
        participationId: updated.id,
        playerId: player.id,
        tieId: tie.id,
        previousStatus: "confirmed",
        newStatus: "declined",
        previousComment: null,
        newComment: "injured",
        previousIsInLineup: null,
        newIsInLineup: null,
        createdAt: expect.any(Date),
      }),
    ]))
  })

  it("accepts all three status values", async () => {
    const season = await createSeason({ name: "S2", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "PART02", isActive: true })
    const team = await createTeam({ seasonId: season.id, name: "Team B", league: null, teamSize: 6 })

    const p1 = await createPlayer({ firstName: "A", lastName: "A" })
    const p2 = await createPlayer({ firstName: "B", lastName: "B" })
    const p3 = await createPlayer({ firstName: "C", lastName: "C" })
    await setTeamPlayers(team.id, [p1.id, p2.id, p3.id])
    const tie = await createTie({ teamId: team.id, opponent: "X", tieDate: "2024-06-01", location: null, isHome: true, notes: null })

    const r1 = await upsertParticipation({ tieId: tie.id, playerId: p1.id, status: "confirmed", comment: null })
    const r2 = await upsertParticipation({ tieId: tie.id, playerId: p2.id, status: "maybe", comment: null })
    const r3 = await upsertParticipation({ tieId: tie.id, playerId: p3.id, status: "declined", comment: null })

    expect(r1.status).toBe("confirmed")
    expect(r2.status).toBe("maybe")
    expect(r3.status).toBe("declined")
  })

  it("persists the comment field", async () => {
    const { player, tie } = await createTestFixture()
    const p = await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "maybe", comment: "Will try to come" })
    expect(p.comment).toBe("Will try to come")
  })
})

describe("getParticipations", () => {
  it("returns participations with player and rank info", async () => {
    const { player, tie } = await createTestFixture()
    await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })
    const list = await getParticipations(tie.id)
    expect(list).toHaveLength(1)
    expect(list[0].firstName).toBe("Anna")
    expect(list[0].lastName).toBe("Müller")
    expect(list[0].playerRank).toBe(1)
  })

  it("returns empty array for a tie with no participations", async () => {
    const { tie } = await createTestFixture()
    expect(await getParticipations(tie.id)).toEqual([])
  })
})

describe("getParticipationsForPlayer", () => {
  it("returns all participations for a player in a season", async () => {
    const { season, player, tie } = await createTestFixture()
    await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })
    const list = await getParticipationsForPlayer(season.id, player.id)
    expect(list).toHaveLength(1)
    expect(list[0].playerId).toBe(player.id)
    expect(list[0].tieId).toBe(tie.id)
    expect(list[0].status).toBe("confirmed")
  })

  it("returns empty array if the player has no participations in the season", async () => {
    const { season, player } = await createTestFixture()
    const list = await getParticipationsForPlayer(season.id, player.id)
    expect(list).toEqual([])
  })
})

describe("getParticipationById", () => {
  it("returns the participation for a valid id", async () => {
    const { player, tie } = await createTestFixture()
    const participation = await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })
    const found = await getParticipationById(participation.id)
    expect(found?.id).toBe(participation.id)
  })

  it("returns undefined for a non-existent id", async () => {
    expect(await getParticipationById(99999)).toBeUndefined()
  })
})

describe("updateParticipationLineup", () => {
  it("sets isInLineup to true", async () => {
    const { player, tie } = await createTestFixture()
    const p = await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })
    expect(p.isInLineup).toBe(false)

    const updated = await updateParticipationLineup(p.id, true)
    expect(updated?.isInLineup).toBe(true)
  })

  it("sets isInLineup back to false", async () => {
    const { player, tie } = await createTestFixture()
    const p = await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })
    await updateParticipationLineup(p.id, true)
    const reverted = await updateParticipationLineup(p.id, false)
    expect(reverted?.isInLineup).toBe(false)
    const audit = await getParticipationAuditForTie(tie.id)
    expect(audit).toHaveLength(3)
    expect(audit).toEqual(expect.arrayContaining([
      expect.objectContaining({
        participationId: p.id,
        previousStatus: null,
        newStatus: null,
        previousIsInLineup: false,
        newIsInLineup: true,
      }),
      expect.objectContaining({
        participationId: p.id,
        previousStatus: null,
        newStatus: null,
        previousIsInLineup: true,
        newIsInLineup: false,
      }),
    ]))
  })
})

describe("participation audit changes", () => {
  it("does not audit identical responses or lineup updates", async () => {
    const { player, tie } = await createTestFixture()
    const data = { tieId: tie.id, playerId: player.id, status: "confirmed" as const, comment: "Available" }
    const participation = await upsertParticipation(data)
    const initialAudit = await getParticipationAuditForTie(tie.id)
    await upsertParticipation(data)
    await updateParticipationLineup(participation.id, false)
    expect(await getParticipationAuditForTie(tie.id)).toEqual(initialAudit)
  })

  it("stores only status changes when the comment stays the same", async () => {
    const { player, tie } = await createTestFixture()
    await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: "Available" })
    await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "maybe", comment: "Available" })
    expect(await getParticipationAuditForTie(tie.id)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        previousStatus: null, newStatus: "confirmed",
        previousComment: null, newComment: "Available",
        previousIsInLineup: null, newIsInLineup: null,
      }),
      expect.objectContaining({
        previousStatus: "confirmed", newStatus: "maybe",
        previousComment: null, newComment: null,
        previousIsInLineup: null, newIsInLineup: null,
      }),
    ]))
  })

  it("records comment-only changes including clearing a comment and empty strings", async () => {
    const { player, tie } = await createTestFixture()
    await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: "Available" })
    await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })
    await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: "" })
    const audit = await getParticipationAuditForTie(tie.id)
    expect(audit).toHaveLength(3)
    expect(audit).toEqual(expect.arrayContaining([
      expect.objectContaining({ previousStatus: null, newStatus: "confirmed", previousComment: null, newComment: "Available" }),
      expect.objectContaining({ previousStatus: null, newStatus: null, previousComment: "Available", newComment: null }),
      expect.objectContaining({ previousStatus: null, newStatus: null, previousComment: null, newComment: "" }),
    ]))
  })

  it("cleans historical snapshots without losing changed fields and is repeatable", async () => {
    const { player, tie } = await createTestFixture()
    await ctx.pool.query(`
      INSERT INTO participation_audit
        (player_id, tie_id, previous_status, new_status, previous_comment, new_comment,
         previous_is_in_lineup, new_is_in_lineup)
      VALUES
        ($1, $2, NULL, 'confirmed', NULL, 'Initial', NULL, false),
        ($1, $2, 'confirmed', 'confirmed', 'Same', 'Same', false, false),
        ($1, $2, 'confirmed', 'confirmed', 'Same', 'Same', false, true),
        ($1, $2, 'confirmed', 'maybe', 'Same', 'Same', false, false),
        ($1, $2, 'confirmed', 'confirmed', 'Old', NULL, true, true)
    `, [player.id, tie.id])
    const migration = readFileSync(join(process.cwd(), "scripts/14-participation-audit-changes-only.sql"), "utf8")
    await ctx.pool.query(migration)
    await ctx.pool.query(migration)
    const audit = await getParticipationAuditForTie(tie.id)
    expect(audit).toHaveLength(3)
    expect(audit).toEqual(expect.arrayContaining([
      expect.objectContaining({
        previousStatus: null, newStatus: null, previousComment: null, newComment: null,
        previousIsInLineup: false, newIsInLineup: true,
      }),
      expect.objectContaining({
        previousStatus: "confirmed", newStatus: "maybe", previousComment: null, newComment: null,
        previousIsInLineup: null, newIsInLineup: null,
      }),
      expect.objectContaining({
        previousStatus: null, newStatus: null, previousComment: "Old", newComment: null,
        previousIsInLineup: null, newIsInLineup: null,
      }),
    ]))
  })

  it("paginates with limit and offset without gaps or duplicates", async () => {
    const { player, tie } = await createTestFixture()
    await ctx.pool.query(`
      INSERT INTO participation_audit (player_id, tie_id, previous_status, new_status)
      SELECT $1, $2, 'confirmed', 'declined' FROM generate_series(1, 250)
    `, [player.id, tie.id])

    const pages = await Promise.all([0, 100, 200].map((offset) => getParticipationAuditForTie(tie.id, 100, offset)))

    expect(pages.map((p) => p.length)).toEqual([100, 100, 50])
    expect(new Set(pages.flat().map((e) => e.id)).size).toBe(250)
  })

  it("defaults to the 100 most recent entries", async () => {
    const { player, tie } = await createTestFixture()
    await ctx.pool.query(`
      INSERT INTO participation_audit (player_id, tie_id, previous_status, new_status)
      SELECT $1, $2, 'confirmed', 'declined' FROM generate_series(1, 120)
    `, [player.id, tie.id])
    expect(await getParticipationAuditForTie(tie.id)).toHaveLength(100)
  })
})

describe("getLineupCount", () => {
  it("returns 0 when no players are in the lineup", async () => {
    const { player, tie } = await createTestFixture()
    await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: null })
    expect(await getLineupCount(tie.id)).toBe(0)
  })

  it("returns the number of players with isInLineup=true", async () => {
    const season = await createSeason({ name: "S3", startDate: "2024-01-01", endDate: "2024-12-31", accessCode: "PART03", isActive: true })
    const team = await createTeam({ seasonId: season.id, name: "Team C", league: null, teamSize: 6 })
    const p1 = await createPlayer({ firstName: "X", lastName: "X" })
    const p2 = await createPlayer({ firstName: "Y", lastName: "Y" })
    await setTeamPlayers(team.id, [p1.id, p2.id])
    const tie = await createTie({ teamId: team.id, opponent: "Z", tieDate: "2024-08-01", location: null, isHome: true, notes: null })

    const part1 = await upsertParticipation({ tieId: tie.id, playerId: p1.id, status: "confirmed", comment: null })
    await upsertParticipation({ tieId: tie.id, playerId: p2.id, status: "confirmed", comment: null })
    await updateParticipationLineup(part1.id, true)

    expect(await getLineupCount(tie.id)).toBe(1)
  })
})
