#!/usr/bin/env tsx

import dotenv from "dotenv"
import bcrypt from "bcryptjs"
import * as db from "./lib/db"

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" })

async function debugAuth() {
  try {
    console.log("🔍 Debugging authentication...")

    // Test user lookup
    console.log("📋 Looking up admin user...")
    const user = await db.getUserByUsernameWithPassword("admin")

    if (!user) {
      console.log("❌ Admin user not found in database!")
      return
    }

    console.log("✅ Admin user found:")
    console.log("  - Username:", user.username)
    console.log("  - Email:", user.email)
    console.log("  - Password hash (first 30 chars):", user.passwordHash.substring(0, 30))
    console.log("  - Password hash length:", user.passwordHash.length)

    // Test password validation
    console.log("\n🔐 Testing password validation...")
    const testPassword = "admin123"
    console.log("Testing password:", testPassword)

    const isValid = await bcrypt.compare(testPassword, user.passwordHash)
    console.log("Password validation result:", isValid ? "✅ VALID" : "❌ INVALID")

    if (!isValid) {
      console.log("\n🔧 Generating new hash for comparison:")
      const newHash = await bcrypt.hash("admin123", 10)
      console.log("New hash:", newHash)
      console.log("Testing new hash:", await bcrypt.compare("admin123", newHash))
    }
  } catch (error) {
    console.error("💥 Error:", error)
  }
}

// Run the debug function
debugAuth()
  .then(() => {
    console.log("\n🏁 Debug complete")
    process.exit(0)
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error)
    process.exit(1)
  })
