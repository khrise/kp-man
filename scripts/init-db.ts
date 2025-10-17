// Database initialization script
// This runs before the Next.js app starts to ensure the database is ready

import { config } from "dotenv"
import { initializeDatabase } from "../lib/migrations"

// Load environment variables from .env.local
config({ path: ".env.local" })

async function main() {
  try {
    console.log("🚀 Starting database initialization...")
    await initializeDatabase()
    console.log("✅ Database initialization completed")
    process.exit(0)
  } catch (error) {
    console.error("❌ Database initialization failed:", error)
    process.exit(1)
  }
}

main()
