import { notFound } from "next/navigation"
import { getLineupData } from "@/app/actions/lineup"
import { LineupClient } from "./lineup-client"
import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"
import { requireAdminPage } from "@/lib/server/auth"
import { Permission } from "@/lib/permissions"
import { ManagementProvider } from "@/components/management-provider"

interface LineupPageProps {
  params: Promise<{
    tieId: string
  }>
}

export default async function LineupPage({ params }: LineupPageProps) {
  const user = await requireAdminPage(Permission.ManagementAccess)
  const { tieId } = await params
  let data: Awaited<ReturnType<typeof getLineupData>>
  try {
    data = await getLineupData(tieId)
  } catch (error) {
    console.error("Failed to load lineup data:", error)
    notFound()
  }

  return (
    <ManagementProvider role={user.role}>
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <AdminHeader />
          <LineupClient {...data} />
        </div>
      </AuthGuard>
    </ManagementProvider>
  )
}