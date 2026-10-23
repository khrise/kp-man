import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import { Pool } from "pg"

jest.mock("@neondatabase/serverless", () => jest.requireActual("pg"))

describe("runMigrations", () => {
  let container: StartedPostgreSqlContainer
  let pool: Pool

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start()
    process.env.DATABASE_URL = container.getConnectionUri()
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  })

  afterAll(async () => {
    await pool.end()
    await container.stop()
  })

  it("applies all migrations, records them, and is idempotent and concurrency-safe", async () => {
    const { runMigrations, getMigrationFiles } = await import("@/lib/migrations")
    const expected = getMigrationFiles().length

    await Promise.all([runMigrations(), runMigrations()])
    await runMigrations()

    const { rows } = await pool.query("SELECT count(*)::int AS n FROM migrations")
    expect(rows[0].n).toBe(expected)
  })
})
