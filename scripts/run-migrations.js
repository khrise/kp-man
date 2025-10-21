#!/usr/bin/env node

/**
 * Manual Migration Runner
 * 
 * Run this script to apply database migrations manually:
 * node scripts/run-migrations.js
 */

const { initializeDatabase } = require('../lib/migrations.js')

async function runMigrations() {
  try {
    console.log('🚀 Starting manual migration...')
    await initializeDatabase()
    console.log('✅ Migrations completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigrations()