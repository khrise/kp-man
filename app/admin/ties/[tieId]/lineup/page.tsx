import { notFound } from "next/navigation"
import { getLineupData } from "@/app/actions/lineup"
import { LineupClient } from "./lineup-client"
import { AuthGuard } from "@/components/auth-guard"
import { AdminHeader } from "@/components/admin-header"

interface LineupPageProps {
  params: Promise<{
    tieId: string
  }>
}

export default async function LineupPage({ params }: LineupPageProps) {
  const { tieId } = await params
  
  try {
    const data = await getLineupData(tieId)
    
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <AdminHeader />
          <LineupClient {...data} />
        </div>
      </AuthGuard>
    )
  } catch (error) {
    console.error("Failed to load lineup data:", error)
    notFound()
  }
}