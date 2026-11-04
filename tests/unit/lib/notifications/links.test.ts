/**
 * @jest-environment node
 */
import { buildTieLinks, getAppBaseUrl } from "@/lib/notifications/links"
import { PushoverProvider } from "@/lib/notifications/providers/pushover"

const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv

describe("getAppBaseUrl", () => {
  it("prefers NEXT_PUBLIC_APP_URL and normalises it to an origin", () => {
    expect(getAppBaseUrl(env({ NEXT_PUBLIC_APP_URL: "https://club.example/app/", VERCEL_URL: "x.vercel.app" }))).toBe(
      "https://club.example",
    )
  })
  it("falls back to the Vercel production host or deployment host", () => {
    expect(getAppBaseUrl(env({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "club.com", VERCEL_URL: "d.vercel.app" }))).toBe("https://club.com")
    expect(getAppBaseUrl(env({ VERCEL_ENV: "preview", VERCEL_URL: "d.vercel.app" }))).toBe("https://d.vercel.app")
  })
  it("returns null when nothing usable is configured", () => {
    expect(getAppBaseUrl(env({}))).toBeNull()
    expect(getAppBaseUrl(env({ NEXT_PUBLIC_APP_URL: "javascript:alert(1)" }))).toBeNull()
  })
})

describe("buildTieLinks", () => {
  it("links the public tie view and the admin lineup view", () => {
    expect(buildTieLinks(7, "AB CD", "https://club.example")).toEqual([
      { label: "Spieltag öffnen", url: "https://club.example/ties/AB%20CD#tie-7" },
      { label: "Aufstellung verwalten", url: "https://club.example/admin/ties/7/lineup" },
    ])
  })
  it("omits links without a base url", () => {
    expect(buildTieLinks(7, "ABCD", null)).toEqual([])
  })
})

describe("PushoverProvider link rendering", () => {
  it("renders escaped HTML anchors only when links exist", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true } as Response)
    process.env.PUSHOVER_APP_TOKEN = "t"
    const provider = new PushoverProvider()

    await provider.send("u", { title: "T", body: "a <b> & c", links: [{ label: "L", url: "https://x.test/a?b=1&c=2" }] })
    const withLinks = JSON.parse(fetchMock.mock.calls[0][1]!.body as string)
    expect(withLinks.html).toBe(1)
    expect(withLinks.message).toBe('a &lt;b&gt; &amp; c\n\n<a href="https://x.test/a?b=1&amp;c=2">L</a>')

    await provider.send("u", { title: "T", body: "a <b>" })
    const plain = JSON.parse(fetchMock.mock.calls[1][1]!.body as string)
    expect(plain.html).toBeUndefined()
    expect(plain.message).toBe("a <b>")
    fetchMock.mockRestore()
  })
})
