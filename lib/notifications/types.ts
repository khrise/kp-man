export interface NotificationMessage {
  title: string
  body: string
}

export interface NotificationProvider {
  /** Stable channel id stored in notification_settings.channel */
  readonly channel: string
  /** Sends a message to the recipient identified by `target` (e.g. a Pushover user key). Throws on failure. */
  send(target: string, message: NotificationMessage): Promise<void>
}

export const WINDOW_MODES = ["next_tie", "days_7", "days_14", "days_30", "all"] as const
export type WindowMode = (typeof WINDOW_MODES)[number]
export const DEFAULT_WINDOW_MODE: WindowMode = "days_14"

export function isWindowMode(value: string): value is WindowMode {
  return (WINDOW_MODES as readonly string[]).includes(value)
}
