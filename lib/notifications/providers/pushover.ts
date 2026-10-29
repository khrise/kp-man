import type { NotificationMessage, NotificationProvider } from "../types"

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
      body: JSON.stringify({ token, user: target, title: message.title, message: message.body }),
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
