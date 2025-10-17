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

// Create migrations table if it doesn't exist
export async function initMigrationsTable(): Promise<void> {
  const db = createMigrationDb()
  try {
    await db.schema
      .createTable("migrations")
      .ifNotExists()
      .addColumn("id", "varchar(255)", (col) => col.primaryKey())
      .addColumn("filename", "varchar(255)", (col) => col.notNull())
      .addColumn("executed_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
      .execute()

    console.log("[MIGRATIONS] Migrations table initialized")
  } catch (error) {
    console.error("[MIGRATIONS] Error creating migrations table:", error)
    throw error
  } finally {
    await db.destroy()
  }
}

// Get executed migrations from database
export async function getExecutedMigrations(): Promise<Migration[]> {
  const db = createMigrationDb()
  try {
    const result = await db.selectFrom("migrations").selectAll().orderBy("executedAt", "asc").execute()

    return result.map((row) => ({
      id: String(row.id),
      filename: String(row.filename),
      content: "",
      executedAt: new Date(row.executedAt),
    }))
  } catch {
    // If table doesn't exist, return empty array
    return []
  } finally {
    await db.destroy()
  }
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

// Execute a single migration
export async function executeMigration(migration: Migration): Promise<void> {
  const db = createMigrationDb()
  try {
    console.log(`[MIGRATIONS] Executing ${migration.filename}...`)

    // Clean the content: remove comments but preserve structure
    const cleanedContent = migration.content
      .split("\n")
      .filter((line) => !line.trim().startsWith("--") && line.trim() !== "")
      .join("\n")

    // Split by semicolon and execute each statement
    const statements = cleanedContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0)

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await sql`${sql.raw(statement)}`.execute(db)
        } catch (error: unknown) {
          const dbError = error as { code?: string; message?: string }

          // Only skip if it's specifically "already exists" errors
          if (dbError.code === "42P07") {
            // relation already exists
            console.log(`[MIGRATIONS] ⚠️  Skipping statement (already exists)`)
            continue
          }

          // For any other error, fail the migration
          console.error(`[MIGRATIONS] Failed statement: ${statement}`)
          throw error
        }
      }
    }

    // Record migration as executed
    await sql`
      INSERT INTO migrations (id, filename, executed_at) 
      VALUES (${migration.id}, ${migration.filename}, NOW())
      ON CONFLICT (id) DO NOTHING
    `.execute(db)

    console.log(`[MIGRATIONS] ✅ ${migration.filename} executed successfully`)
  } catch (error) {
    console.error(`[MIGRATIONS] ❌ Error executing ${migration.filename}:`, error)
    throw error
  } finally {
    await db.destroy()
  }
}

// Run all pending migrations
export async function runMigrations(): Promise<void> {
  try {
    console.log("[MIGRATIONS] Starting database migration check...")

    // Initialize migrations table
    await initMigrationsTable()

    // Get migration files and executed migrations
    const migrationFiles = getMigrationFiles()
    const executedMigrations = await getExecutedMigrations()
    const executedIds = new Set(executedMigrations.map((m) => m.id))

    console.log(`[MIGRATIONS] Found ${migrationFiles.length} migration files`)
    console.log(`[MIGRATIONS] ${executedMigrations.length} migrations already executed`)

    // Find pending migrations
    const pendingMigrations = migrationFiles.filter((m) => !executedIds.has(m.id))

    if (pendingMigrations.length === 0) {
      console.log("[MIGRATIONS] ✅ All migrations are up to date")
      return
    }

    console.log(`[MIGRATIONS] Found ${pendingMigrations.length} pending migrations`)

    // Execute pending migrations
    for (const migration of pendingMigrations) {
      await executeMigration(migration)
    }

    console.log("[MIGRATIONS] ✅ All migrations completed successfully")
  } catch (error) {
    console.error("[MIGRATIONS] ❌ Migration failed:", error)
    throw error
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
