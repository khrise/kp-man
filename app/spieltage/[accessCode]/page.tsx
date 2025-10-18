import { redirect } from "next/navigation"

interface SpieltagePageProps {
  params: Promise<{
    accessCode: string
  }>
}

export default async function SpieltageAccessCodePage({ params }: SpieltagePageProps) {
  const { accessCode } = await params
  
  // Redirect to new ties route
  redirect(`/ties/${accessCode}`)
}