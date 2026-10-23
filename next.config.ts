import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",
  // Migrations are read from disk at runtime, so make sure they are traced into the bundle
  outputFileTracingIncludes: {
    "/*": ["./scripts/*.sql"],
  },
}

export default nextConfig
