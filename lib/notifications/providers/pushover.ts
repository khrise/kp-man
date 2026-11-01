import type { NotificationMessage, NotificationProvider } from "../types"

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

// Pushover only supports one supplementary URL, so links are rendered as HTML anchors in the body
function renderMessage(message: NotificationMessage): { message: string; html?: 1 } {
  if (!message.links?.length) return { message: message.body }
  const anchors = message.links.map((link) => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`)
  return { message: `${escapeHtml(message.body)}\n\n${anchors.join("\n")}`, html: 1 }
}

const PUSHOVER_URL = "https://api.pushover.net/1/messages.json"

export class PushoverProvider implements NotificationProvider {
  readonly channel = "pushover"

  async send(target: string, message: NotificationMessage): Promise<void> {
    const token = process.env.PUSHOVER_APP_TOKEN
    if (!token) {
      throw new Error("PUSHOVER_APP_TOKEN is not configured")
    }
    if (!target) {
      throw new Error("Pushover user key is missing")
    }

    const response = await fetch(PUSHOVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, user: target, title: message.title, ...renderMessage(message) }),
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      // Never include token or user key in the error
      let detail = ""
      try {
        const json = (await response.json()) as { errors?: string[] }
        detail = json.errors?.join(", ") ?? ""
      } catch {
        // ignore body parse errors
      }
      throw new Error(`Pushover request failed (${response.status})${detail ? `: ${detail}` : ""}`)
    }
  }
}
