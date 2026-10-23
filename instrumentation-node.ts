export async function runStartupMigrations() {
  // Never migrate during `next build`; only when the server actually starts
  if (process.env.NEXT_PHASE === "phase-production-build") return
  if (process.env.AUTO_MIGRATE === "false" || !process.env.DATABASE_URL) return

  const { initializeDatabase } = await import("./lib/migrations")
  await initializeDatabase()
}
