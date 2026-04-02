import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import { Pool } from "pg"
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely"
import * as fs from "fs"
import * as path from "path"
import type { Database } from "@/lib/db"

type GlobalWithDb = typeof globalThis & { db?: Kysely<Database> }

// SQL migration files to run in order (alphabetical = numeric order by filename prefix)
const MIGRATION_FILES = [
  "01-create-tables.sql",
  "04-add-participation-comments.sql",
  "05-remove-player-contact-fields.sql",
  "06-add-user-roles.sql",
  "07-add-team-size.sql",
  "08-add-lineup-functionality.sql",
  "09-add-app-settings.sql",
  "10-update-tie-date-to-timestamptz.sql",
  "11-add-tie-ready.sql",
]

async function runMigrations(pool: Pool): Promise<void> {
  const scriptsDir = path.join(process.cwd(), "scripts")
  for (const filename of MIGRATION_FILES) {
    const filePath = path.join(scriptsDir, filename)
    const sql = fs.readFileSync(filePath, "utf-8")
    await pool.query(sql)
  }
}

export interface TestDatabaseContext {
  db: Kysely<Database>
  pool: Pool
  cleanup: () => Promise<void>
}

export async function setupTestDatabase(): Promise<TestDatabaseContext> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer("postgres:16-alpine").start()

  const connectionString = container.getConnectionUri()
  const pool = new Pool({ connectionString })

  await runMigrations(pool)

  const testDb = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
    plugins: [new CamelCasePlugin()],
  })

  // Inject the test db instance into the globalThis proxy used by lib/db.ts
  ;(globalThis as GlobalWithDb).db = testDb

  return {
    db: testDb,
    pool,
    cleanup: async () => {
      ;(globalThis as GlobalWithDb).db = undefined
      await testDb.destroy()
      await container.stop()
    },
  }
}

/**
 * Truncates all data tables and restarts identity sequences for test isolation.
 * Skips the migrations tracking table.
 */
export async function truncateAllTables(pool: Pool): Promise<void> {
  await pool.query(`
    TRUNCATE
      participations,
      team_players,
      ties,
      teams,
      seasons,
      users,
      players,
      app_settings
    RESTART IDENTITY CASCADE
  `)
}
