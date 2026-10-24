import { requireAdminPage } from "@/lib/server/auth"
import UsersClient from "./users-client"

export default async function UsersPage() {
  await requireAdminPage()
  return <UsersClient />
}
