import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { SeasonsClient } from "./seasons-client"
import * as db from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function SeasonsPage() {
  const seasons = await db.getSeasons()

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <main className="mx-auto max-w-7xl px-6 py-8">
          <SeasonsClient initialSeasons={seasons} />
        </main>
      </div>
    </AuthGuard>
  )
}
