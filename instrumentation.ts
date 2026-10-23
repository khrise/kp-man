export async function register() {
  // The inline check lets webpack drop the Node-only import from the Edge bundle
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runStartupMigrations } = await import("./instrumentation-node")
    await runStartupMigrations()
  }
}
