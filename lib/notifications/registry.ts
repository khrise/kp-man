import type { NotificationProvider } from "./types"
import { PushoverProvider } from "./providers/pushover"

const providers = new Map<string, NotificationProvider>()

export function registerProvider(provider: NotificationProvider): void {
  providers.set(provider.channel, provider)
}

export function getProvider(channel: string): NotificationProvider | undefined {
  return providers.get(channel)
}

export function getChannels(): string[] {
  return [...providers.keys()]
}

// Additional channels (e.g. email) are added by registering another provider here
registerProvider(new PushoverProvider())
