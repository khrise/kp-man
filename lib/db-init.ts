import { initializeDatabase } from "./migrations"

let initPromise: Promise<void> | null = null

export async function ensureDatabaseInitialized(): Promise<void> {
  if (initPromise) {
    return initPromise
  }

  initPromise = initializeDatabase()
  return initPromise
}

// Auto-initialize on module load in development
if (process.env.NODE_ENV === "development") {
  ensureDatabaseInitialized().catch(console.error)
}
