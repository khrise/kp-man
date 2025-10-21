import { initializeDatabase } from "./migrations"

let initPromise: Promise<void> | null = null

export async function ensureDatabaseInitialized(): Promise<void> {
  if (initPromise) {
    return initPromise
  }

  initPromise = initializeDatabase()
  return initPromise
}

// Auto-initialize on module load in development - DISABLED
// The automatic initialization was causing issues with complex SQL syntax
// Run migrations manually using: npm run migrate or via admin interface
if (false && process.env.NODE_ENV === "development") {
  ensureDatabaseInitialized().catch(console.error)
}
