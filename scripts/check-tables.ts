import { Pool } from "@neondatabase/serverless"
import { config } from "dotenv"

config({ path: ".env.local" })

async function checkTables() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    const client = await pool.connect()
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `)

    console.log("Tables in database:")
    if (result.rows.length === 0) {
      console.log("  (No tables found)")
    } else {
      result.rows.forEach((row) => console.log("  -", row.table_name))
    }

    client.release()
  } catch (error) {
    console.error("Database error:", error)
  } finally {
    await pool.end()
  }
}

checkTables()
