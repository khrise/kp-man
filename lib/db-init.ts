import { initializeDatabase } from "./migrations"

let initPromise: Promise<void> | null = null

export async function ensureDatabaseInitialized(): Promise<void> {
  if (initPromise) {
    return initPromise
  }

  initPromise = initializeDatabase()
  return initPromise
}
