import { tieAnchorId } from "@/lib/tie-anchor"
import type { NotificationLink } from "./types"

// Explicit NEXT_PUBLIC_APP_URL wins; otherwise fall back to the Vercel-provided host
export function getAppBaseUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const explicit = env.NEXT_PUBLIC_APP_URL?.trim()
  const vercelHost =
    env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL
      ? env.VERCEL_PROJECT_PRODUCTION_URL
      : env.VERCEL_URL
  const raw = explicit || (vercelHost ? `https://${vercelHost.trim()}` : "")
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    return url.origin
  } catch {
    return null
  }
}

export function buildTieLinks(
  tieId: number,
  accessCode: string | null | undefined,
  baseUrl: string | null = getAppBaseUrl(),
): NotificationLink[] {
  if (!baseUrl) return []
  const links: NotificationLink[] = []
  if (accessCode) {
    links.push({
      label: "Spieltag öffnen",
      url: `${baseUrl}/ties/${encodeURIComponent(accessCode)}#${tieAnchorId(tieId)}`,
    })
  }
  links.push({ label: "Aufstellung verwalten", url: `${baseUrl}/admin/ties/${tieId}/lineup` })
  return links
}
