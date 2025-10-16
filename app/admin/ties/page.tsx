import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import * as db from "@/lib/db"
import { TiesClient } from "./ties-client"

// Force dynamic rendering for admin pages
export const dynamic = 'force-dynamic'

export default async function TiesPage() {
    const [ties, teams, seasons] = await Promise.all([db.getTies(), db.getTeams(), db.getSeasons()])

    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <AdminHeader />
          <TiesClient initialTies={ties} teams={teams} seasons={seasons} />
        </div>
      </AuthGuard>
    )
}
