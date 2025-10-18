import { SpieltageClient } from "../spieltage-client"
import { validateAccessCode } from "@/app/actions/public"
import { redirect } from "next/navigation"

interface SpieltagePageProps {
  params: {
    accessCode: string
  }
}

export default async function SpieltageAccessCodePage({ params }: SpieltagePageProps) {
  const { accessCode } = params
  
  // Validate the access code
  const result = await validateAccessCode(accessCode.toUpperCase())
  
  if (!result.valid || !result.seasonId) {
    // Redirect to home with error
    redirect("/?error=invalid")
  }

  return <SpieltageClient accessCode={accessCode.toUpperCase()} seasonId={result.seasonId} />
}