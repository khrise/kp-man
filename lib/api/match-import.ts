export async function fetchMatchImportPage(url: string, teamId: number): Promise<string> {
  const response = await fetch("/api/proxy-fetch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, teamId }),
  })
  const body: { html?: string; error?: string } = await response.json()
  if (!response.ok) throw new Error(body.error ?? `Import failed (${response.status})`)
  if (typeof body.html !== "string") throw new Error("Invalid import response")
  return body.html
}
