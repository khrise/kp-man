import { requireAdminPage } from "@/lib/server/auth"
import PlayersClient from "./players-client"

export default async function PlayersPage() {
  await requireAdminPage()
  return <PlayersClient />
}
