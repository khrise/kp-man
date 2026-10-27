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
  setManagedParticipationStatus,
  updateParticipationCaptainComment,
  updateTieCaptainComment,
  getTieWithParticipations,
  updateTieReady,
  createUser,
  getPlayersWithoutParticipation,
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

describe("captain-managed lineup data", () => {
  it("resets an RSVP and lineup selection atomically while retaining its captain comment and audit history", async () => {
    const { player, tie } = await createTestFixture()
    const captain = await createUser({
      username: "captain-user", email: "captain@example.com",
      passwordHash: "not-used", role: "team_captain", playerId: null,
    })
    const participation = await upsertParticipation({
      tieId: tie.id, playerId: player.id, status: "confirmed", comment: "Player note",
    })
    await updateParticipationLineup(participation.id, true)
    await updateParticipationCaptainComment(tie.id, player.id, "Captain note", captain.id, captain.username)
    const before = await getParticipationAuditForTie(tie.id)

    await expect(updateParticipationCaptainComment(
      tie.id, player.id, "Changed note", -1, captain.username, "no_response",
    )).rejects.toThrow()
    expect(await getParticipationById(participation.id)).toEqual(expect.objectContaining({ isInLineup: true }))
    expect(await getParticipationAuditForTie(tie.id)).toEqual(before)

    await updateTieReady(tie.id, true)
    await expect(updateParticipationCaptainComment(
      tie.id, player.id, "Captain note", captain.id, captain.username, "no_response",
    )).rejects.toThrow("Unfinalize the lineup")
    await updateTieReady(tie.id, false)
    await updateParticipationCaptainComment(tie.id, player.id, "Changed note", captain.id, captain.username, "no_response")

    expect(await getParticipations(tie.id)).toEqual([])
    expect(await getLineupCount(tie.id)).toBe(0)
    expect(await getPlayersWithoutParticipation(tie.id)).toEqual([
      expect.objectContaining({ captainComment: "Changed note", captainCommentAuthor: captain.username }),
    ])
    const audit = await getParticipationAuditForTie(tie.id)
    expect(audit).toHaveLength(before.length + 1)
    expect(audit[0]).toEqual(expect.objectContaining({
      participationId: null, previousStatus: "confirmed", newStatus: null,
      previousComment: "Player note", newComment: null,
      previousCaptainComment: "Captain note", newCaptainComment: "Changed note",
      previousIsInLineup: true, newIsInLineup: false, changedBy: captain.username,
    }))
    expect(audit.slice(1)).toEqual(before)
    await updateParticipationCaptainComment(tie.id, player.id, "Changed note", captain.id, captain.username, "no_response")
    expect(await getParticipationAuditForTie(tie.id)).toEqual(audit)
  })

  it("resets an unselected RSVP without reporting a lineup change and preserves the captain comment author", async () => {
    const { player, tie } = await createTestFixture()
    const captain = await createUser({
      username: "captain-user", email: "captain@example.com",
      passwordHash: "not-used", role: "team_captain", playerId: null,
    })
    await updateParticipationCaptainComment(tie.id, player.id, "Keep note", captain.id, captain.username, "maybe")
    await updateParticipationCaptainComment(tie.id, player.id, "Keep note", -1, "other-captain", "no_response")
    const audit = await getParticipationAuditForTie(tie.id)
    expect(audit[0]).toEqual(expect.objectContaining({
      previousStatus: "maybe", newStatus: null, previousIsInLineup: null, newIsInLineup: null,
      previousCaptainComment: null, newCaptainComment: null,
    }))
    expect(await getPlayersWithoutParticipation(tie.id)).toEqual([
      expect.objectContaining({ captainComment: "Keep note", captainCommentAuthor: captain.username }),
    ])
  })

  it.each(["public", "captain"])("serializes concurrent first RSVPs starting with %s and preserves both comments", async (first) => {
    const { player, tie } = await createTestFixture()
    const captain = await createUser({
      username: "captain-user", email: "captain@example.com",
      passwordHash: "not-used", role: "team_captain", playerId: null,
    })
    const publicSave = () => upsertParticipation({
      tieId: tie.id, playerId: player.id, status: "maybe", comment: "Player note",
    })
    const captainSave = () => updateParticipationCaptainComment(
      tie.id, player.id, "Captain note", captain.id, captain.username, "confirmed",
    )
    await Promise.all(first === "public" ? [publicSave(), captainSave()] : [captainSave(), publicSave()])

    const participations = await getParticipations(tie.id)
    expect(participations).toHaveLength(1)
    expect(participations[0]).toEqual(expect.objectContaining({
      comment: "Player note", captainComment: "Captain note", isInLineup: false,
    }))
    const audit = (await getParticipationAuditForTie(tie.id)).sort((a, b) => a.id - b.id)
    expect(audit).toHaveLength(2)
    expect(audit[0].previousStatus).toBeNull()
    expect(audit[1].previousStatus).toBe(audit[0].newStatus)
    expect(participations[0].status).toBe(audit[1].newStatus)
    expect(audit.find((entry) => entry.changedBy === null)).toEqual(expect.objectContaining({
      previousComment: null, newComment: "Player note",
    }))
    expect(audit.find((entry) => entry.changedBy === captain.username)).toEqual(expect.objectContaining({
      previousCaptainComment: null, newCaptainComment: "Captain note",
    }))
  })

  it("saves status and captain comment atomically and rolls both back on failure", async () => {
    const { player, tie } = await createTestFixture()
    const captain = await createUser({
      username: "captain-user", email: "captain@example.com",
      passwordHash: "not-used", role: "team_captain", playerId: null,
    })
    await updateParticipationCaptainComment(tie.id, player.id, "Doubles only", captain.id, captain.username, "confirmed")
    expect((await getParticipations(tie.id))[0]).toEqual(expect.objectContaining({
      status: "confirmed", captainComment: "Doubles only",
    }))
    const audit = await getParticipationAuditForTie(tie.id)
    expect(audit).toEqual([expect.objectContaining({
      previousStatus: null, newStatus: "confirmed",
      previousCaptainComment: null, newCaptainComment: "Doubles only",
      previousIsInLineup: null, newIsInLineup: null,
      changedBy: captain.username,
    })])

    await expect(updateParticipationCaptainComment(
      tie.id, player.id, "New note", -1, captain.username, "declined",
    )).rejects.toThrow()
    expect((await getParticipations(tie.id))[0]).toEqual(expect.objectContaining({
      status: "confirmed", captainComment: "Doubles only",
    }))
    expect(await getParticipationAuditForTie(tie.id)).toEqual(audit)

    await updateTieReady(tie.id, true)
    await expect(updateParticipationCaptainComment(
      tie.id, player.id, "Locked note", captain.id, captain.username, "declined",
    )).rejects.toThrow("Unfinalize the lineup")
    await updateParticipationCaptainComment(tie.id, player.id, "Comment only", captain.id, captain.username)
    expect((await getParticipations(tie.id))[0]).toEqual(expect.objectContaining({
      status: "confirmed", captainComment: "Comment only",
    }))
  })

  it("removes the player's comment atomically with an audit entry and keeps status and captain comment", async () => {
    const { player, tie } = await createTestFixture()
    const captain = await createUser({
      username: "captain-user", email: "captain@example.com",
      passwordHash: "not-used", role: "team_captain", playerId: null,
    })
    await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "confirmed", comment: "Inappropriate" })
    await updateParticipationCaptainComment(tie.id, player.id, "Captain note", captain.id, captain.username)
    await updateTieReady(tie.id, true)
    const before = await getParticipationAuditForTie(tie.id)

    await updateParticipationCaptainComment(tie.id, player.id, "Captain note", captain.id, captain.username, null, true)
    expect((await getParticipations(tie.id))[0]).toEqual(expect.objectContaining({
      status: "confirmed", comment: null, captainComment: "Captain note",
    }))
    const audit = await getParticipationAuditForTie(tie.id)
    expect(audit).toHaveLength(before.length + 1)
    expect(audit[0]).toEqual(expect.objectContaining({
      previousStatus: null, newStatus: null,
      previousComment: "Inappropriate", newComment: null,
      previousCaptainComment: null, newCaptainComment: null,
      changedBy: captain.username,
    }))

    await updateParticipationCaptainComment(tie.id, player.id, "Captain note", captain.id, captain.username, null, true)
    expect(await getParticipationAuditForTie(tie.id)).toEqual(audit)
  })

  it("combines status, comment and actual lineup changes in one entry and skips unchanged saves", async () => {
    const { player, tie } = await createTestFixture()
    const captain = await createUser({
      username: "captain-user", email: "captain@example.com",
      passwordHash: "not-used", role: "team_captain", playerId: null,
    })
    await updateParticipationCaptainComment(tie.id, player.id, "Original note", captain.id, captain.username, "confirmed")
    const participation = (await getParticipations(tie.id))[0]
    await updateParticipationLineup(participation.id, true)
    const before = await getParticipationAuditForTie(tie.id)

    await updateParticipationCaptainComment(tie.id, player.id, "Unavailable", captain.id, captain.username, "declined")
    const audit = await getParticipationAuditForTie(tie.id)
    expect(audit).toHaveLength(before.length + 1)
    expect(audit[0]).toEqual(expect.objectContaining({
      previousStatus: "confirmed", newStatus: "declined",
      previousCaptainComment: "Original note", newCaptainComment: "Unavailable",
      previousIsInLineup: true, newIsInLineup: false,
    }))

    await updateParticipationCaptainComment(tie.id, player.id, "Unavailable", captain.id, captain.username, "declined")
    expect(await getParticipationAuditForTie(tie.id)).toEqual(audit)

    await updateParticipationCaptainComment(tie.id, player.id, "Unavailable", captain.id, captain.username, "maybe")
    const statusOnlyAudit = await getParticipationAuditForTie(tie.id)
    expect(statusOnlyAudit).toHaveLength(audit.length + 1)
    expect(statusOnlyAudit[0]).toEqual(expect.objectContaining({
      previousStatus: "declined", newStatus: "maybe",
      previousCaptainComment: null, newCaptainComment: null,
      previousIsInLineup: null, newIsInLineup: null,
    }))
  })

  it("preserves existing participation comments when migrating to independent storage", async () => {
    const { player, tie } = await createTestFixture()
    const captain = await createUser({
      username: "captain-user", email: "captain@example.com",
      passwordHash: "not-used", role: "team_captain", playerId: null,
    })
    const participation = await upsertParticipation({
      tieId: tie.id, playerId: player.id, status: "maybe", comment: "Player note",
    })
    const client = await ctx.pool.connect()
    try {
      await client.query("BEGIN")
      await client.query(`
        ALTER TABLE participations
          ADD COLUMN captain_comment TEXT,
          ADD COLUMN captain_comment_by INTEGER,
          ADD COLUMN captain_comment_author_username VARCHAR(255)
      `)
      await client.query(`
        UPDATE participations
        SET captain_comment = 'Existing captain note', captain_comment_by = $1,
          captain_comment_author_username = $2
        WHERE id = $3
      `, [captain.id, captain.username, participation.id])
      await client.query(readFileSync(join(process.cwd(), "scripts/16-independent-player-captain-comments.sql"), "utf8"))
      const result = await client.query("SELECT * FROM player_captain_comments WHERE tie_id = $1 AND player_id = $2", [tie.id, player.id])
      expect(result.rows).toEqual([expect.objectContaining({
        captain_comment: "Existing captain note",
        captain_comment_by: captain.id,
        captain_comment_author_username: captain.username,
      })])
    } finally {
      await client.query("ROLLBACK")
      client.release()
    }
  })

  it.each(["public", "captain"])("keeps comments independent of a missing RSVP and preserves them on a later %s RSVP", async (source) => {
    const { season, player, tie } = await createTestFixture()
    const captain = await createUser({
      username: "captain-user", email: "captain@example.com",
      passwordHash: "not-used", role: "team_captain", playerId: player.id,
    })

    await updateParticipationCaptainComment(tie.id, player.id, "Call before confirming", captain.id, captain.username)
    expect(await getParticipations(tie.id)).toEqual([])
    expect(await getParticipationsForPlayer(season.id, player.id)).toEqual([])
    expect(await getLineupCount(tie.id)).toBe(0)
    expect(await getPlayersWithoutParticipation(tie.id)).toEqual([
      expect.objectContaining({ playerId: player.id, captainComment: "Call before confirming", captainCommentAuthor: "Anna Müller" }),
    ])
    expect(await getParticipationAuditForTie(tie.id)).toEqual([
      expect.objectContaining({ participationId: null, newStatus: null, newCaptainComment: "Call before confirming", changedBy: captain.username }),
    ])

    if (source === "public") {
      await upsertParticipation({ tieId: tie.id, playerId: player.id, status: "maybe", comment: "Player note" })
    } else {
      await setManagedParticipationStatus(tie.id, player.id, "maybe", captain.username)
    }
    expect(await getPlayersWithoutParticipation(tie.id)).toEqual([])
    expect(await getParticipations(tie.id)).toEqual([
      expect.objectContaining({ status: "maybe", captainComment: "Call before confirming", captainCommentAuthor: "Anna Müller" }),
    ])
    await updateParticipationCaptainComment(tie.id, player.id, null, captain.id, captain.username)
    expect((await getParticipations(tie.id))[0].captainComment).toBeNull()
  })

  it("rejects comments for players outside the tie team", async () => {
    const { tie } = await createTestFixture()
    const outsider = await createPlayer({ firstName: "Other", lastName: "Player" })
    await expect(updateParticipationCaptainComment(tie.id, outsider.id, "note", 1, "captain"))
      .rejects.toThrow("Player does not belong to tie team")
    expect(await getParticipationAuditForTie(tie.id)).toEqual([])
  })

  it("creates an RSVP for a non-responder and attributes the audit entry", async () => {
    const { player, tie } = await createTestFixture()
    const participation = await setManagedParticipationStatus(tie.id, player.id, "confirmed", "captain-user")

    expect(participation.status).toBe("confirmed")
    expect(await getParticipationById(participation.id)).toEqual(expect.objectContaining({ status: "confirmed" }))
    expect(await getParticipationAuditForTie(tie.id)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        participationId: participation.id,
        previousStatus: null,
        newStatus: "confirmed",
        previousIsInLineup: null,
        newIsInLineup: null,
        changedBy: "captain-user",
      }),
    ]))
  })

  it("locks captain-managed RSVP changes while finalized and clears lineup membership on decline", async () => {
    const { player, tie } = await createTestFixture()
    const participation = await upsertParticipation({
      tieId: tie.id, playerId: player.id, status: "confirmed", comment: null,
    })
    await updateParticipationLineup(participation.id, true)
    await setManagedParticipationStatus(tie.id, player.id, "declined", "captain-user")

    expect(await getParticipationById(participation.id)).toEqual(expect.objectContaining({
      status: "declined",
      isInLineup: false,
    }))

    await updateTieReady(tie.id, true)
    await expect(
      setManagedParticipationStatus(tie.id, player.id, "maybe", "captain-user"),
    ).rejects.toThrow("Unfinalize the lineup before changing RSVP status")
  })

  it("shows connected player names as captain comment authors and audits RSVP comments", async () => {
    const { player, tie } = await createTestFixture()
    const captain = await createUser({
      username: "captain-user",
      email: "captain@example.com",
      passwordHash: "not-used",
      role: "team_captain",
      playerId: player.id,
    })
    await upsertParticipation({
      tieId: tie.id, playerId: player.id, status: "confirmed", comment: null,
    })

    await updateTieCaptainComment(tie.id, "Singles only", captain.id, captain.username)
    await updateParticipationCaptainComment(tie.id, player.id, "Doubles only", captain.id, captain.username)

    const result = await getTieWithParticipations(tie.id)
    expect(result?.captainCommentAuthor).toBe("Anna Müller")
    expect(result?.participations[0]).toEqual(expect.objectContaining({
      captainComment: "Doubles only",
      captainCommentAuthor: "Anna Müller",
    }))
    expect(await getParticipationAuditForTie(tie.id)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        previousCaptainComment: null,
        newCaptainComment: "Doubles only",
        changedBy: "captain-user",
      }),
    ]))

    const unlinkedCaptain = await createUser({
      username: "unlinked-captain",
      email: "unlinked@example.com",
      passwordHash: "not-used",
      role: "team_captain",
      playerId: null,
    })
    await updateTieCaptainComment(tie.id, "Updated note", unlinkedCaptain.id, unlinkedCaptain.username)
    expect((await getTieWithParticipations(tie.id))?.captainCommentAuthor).toBe("unlinked-captain")
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
