import { sql } from "kysely"
import fs from "fs"
import path from "path"
import { Pool } from "@neondatabase/serverless"
import { Kysely, PostgresDialect, CamelCasePlugin } from "kysely"
import { Database } from "./db"

export interface Migration {
  id: string
  filename: string
  content: string
  executedAt?: Date
}

// Create a direct database connection for migrations
function createMigrationDb(): Kysely<Database> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set")
  }

  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: process.env.DATABASE_URL,
      }),
    }),
    plugins: [new CamelCasePlugin()],
  })
}

// Read migration files from scripts directory
export function getMigrationFiles(): Migration[] {
  const scriptsDir = path.join(process.cwd(), "scripts")

  if (!fs.existsSync(scriptsDir)) {
    console.warn("[MIGRATIONS] Scripts directory not found:", scriptsDir)
    return []
  }

  const files = fs
    .readdirSync(scriptsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()

  return files.map((filename) => {
    const content = fs.readFileSync(path.join(scriptsDir, filename), "utf-8")
    return {
      id: filename.replace(".sql", ""),
      filename,
      content,
    }
  })
}

const MIGRATION_LOCK_ID = 727274001

// Execute a single migration file as one multi-statement query (handles $$ bodies)
export async function executeMigration(migration: Migration, executor: Kysely<Database>): Promise<void> {
  console.log(`[MIGRATIONS] Executing ${migration.filename}...`)
  await sql.raw(migration.content).execute(executor)
  await sql`
    INSERT INTO migrations (id, filename, executed_at)
    VALUES (${migration.id}, ${migration.filename}, NOW())
    ON CONFLICT (id) DO NOTHING
  `.execute(executor)
  console.log(`[MIGRATIONS] ✅ ${migration.filename} executed successfully`)
}

// Run all pending migrations in one transaction, serialized across instances by an advisory lock
export async function runMigrations(): Promise<void> {
  const db = createMigrationDb()
  try {
    console.log("[MIGRATIONS] Starting database migration check...")

    await db.transaction().execute(async (trx) => {
      await sql`SELECT pg_advisory_xact_lock(${MIGRATION_LOCK_ID})`.execute(trx)

      await trx.schema
        .createTable("migrations")
        .ifNotExists()
        .addColumn("id", "varchar(255)", (col) => col.primaryKey())
        .addColumn("filename", "varchar(255)", (col) => col.notNull())
        .addColumn("executed_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
        .execute()

      const migrationFiles = getMigrationFiles()
      const executed = await trx.selectFrom("migrations").select("id").execute()
      const executedIds = new Set(executed.map((m) => String(m.id)))
      const pending = migrationFiles.filter((m) => !executedIds.has(m.id))

      console.log(`[MIGRATIONS] Found ${migrationFiles.length} migration files, ${pending.length} pending`)

      for (const migration of pending) {
        await executeMigration(migration, trx)
      }
    })

    console.log("[MIGRATIONS] ✅ Migrations up to date")
  } catch (error) {
    console.error("[MIGRATIONS] ❌ Migration failed:", error)
    throw error
  } finally {
    await db.destroy()
  }
}

// Initialize database on startup
export async function initializeDatabase(): Promise<void> {
  const db = createMigrationDb()
  try {
    console.log("[DB] Initializing database...")

    // Test database connection
    await sql`SELECT table_name FROM information_schema.tables LIMIT 1`.execute(db)
    console.log("[DB] Database connection successful")

    // Run migrations
    await runMigrations()

    console.log("[DB] ✅ Database initialization completed")
  } catch (error) {
    console.error("[DB] ❌ Database initialization failed:", error)
    throw error
  } finally {
    await db.destroy()
  }
}
