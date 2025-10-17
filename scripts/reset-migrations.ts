import { Pool } from "@neondatabase/serverless"
import { Kysely, PostgresDialect, CamelCasePlugin, sql } from "kysely"
import { config } from "dotenv"

config({ path: ".env.local" })

function createMigrationDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set")
  }

  return new Kysely({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: process.env.DATABASE_URL,
      }),
    }),
    plugins: [new CamelCasePlugin()],
  })
}

async function resetMigrations() {
  const db = createMigrationDb()

  try {
    console.log("🔄 Resetting migrations...")

    // Delete all migration records
    await sql`DELETE FROM migrations`.execute(db)
    console.log("✅ Migration records cleared")

    // List current tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name != 'migrations'
      ORDER BY table_name
    `.execute(db)

    console.log("📋 Current tables (excluding migrations):")
    if (tables.rows.length === 0) {
      console.log("  (No tables found)")
    } else {
      tables.rows.forEach((row) => console.log("  -", (row as { table_name: string }).table_name))
    }
  } catch (error) {
    console.error("❌ Reset failed:", error)
    throw error
  } finally {
    await db.destroy()
  }
}

resetMigrations()
