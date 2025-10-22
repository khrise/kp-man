import { SpieltageClient } from "../spieltage-client"
import { validateAccessCode } from "@/app/actions/public"
import { redirect } from "next/navigation"

interface TiesPageProps {
  params: Promise<{
    accessCode: string
  }>
}

export default async function TiesAccessCodePage({ params }: TiesPageProps) {
  const { accessCode } = await params
  
  // Validate the access code
  const result = await validateAccessCode(accessCode.toUpperCase())
  
  if (!result.valid || !result.seasonId) {
    // Redirect to home with error
    redirect("/?error=invalid")
  }

  
  
  return <SpieltageClient 
    accessCode={accessCode.toUpperCase()} seasonId={result.seasonId}  />
}