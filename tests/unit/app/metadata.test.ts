/** @jest-environment node */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { headers } from "next/headers"
import { getConfigValue } from "@/lib/config-service"
import { generateMetadata } from "@/app/layout"

jest.mock("next/headers", () => ({ headers: jest.fn() }))
jest.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}))
jest.mock("@/components/providers", () => ({ Providers: jest.fn() }))
jest.mock("@/lib/config-service", () => ({ getConfigValue: jest.fn() }))

const mockHeaders = jest.mocked(headers)
const mockGetConfigValue = jest.mocked(getConfigValue)

describe("root page metadata", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetConfigValue.mockResolvedValue("Tennis Club")
  })

  it.each([
    [{ host: "club-one.example" }, "https://club-one.example"],
    [{ host: "club-two.example" }, "https://club-two.example"],
    [{
      host: "internal:3000",
      "x-forwarded-host": "public.example, internal",
      "x-forwarded-proto": "https, http",
    }, "https://public.example"],
    [{
      host: "internal:3000",
      "x-forwarded-host": "second.example",
      "x-forwarded-proto": "https",
    }, "https://second.example"],
    [{ host: "localhost:3000" }, "http://localhost:3000"],
    [{ host: "127.0.0.1:3000" }, "http://127.0.0.1:3000"],
    [{ host: "[::1]:3000" }, "http://[::1]:3000"],
    [{ host: "local.example:8080", "x-forwarded-proto": "http" }, "http://local.example:8080"],
  ])("resolves social images from request headers %j", async (values, origin) => {
    mockHeaders.mockResolvedValue(new Headers(values))

    const metadata = await generateMetadata()
    const image = {
      url: `${origin}/icons/social-preview.png`,
      width: 1200,
      height: 630,
      alt: "Tennis Club Management",
    }

    expect(metadata.metadataBase?.origin).toBe(origin)
    expect(metadata.title).toBe("Tennis Club Management")
    expect(metadata.description).toBe("Manage your tennis club seasons, teams, and players")
    expect(metadata.openGraph).toEqual({
      title: metadata.title,
      description: metadata.description,
      type: "website",
      images: [image],
    })
    expect(metadata.twitter).toEqual({
      card: "summary_large_image",
      title: metadata.title,
      description: metadata.description,
      images: [image],
    })
    expect(metadata.icons).toEqual({
      icon: { url: "/icons/icon.png", type: "image/png", sizes: "160x160" },
      shortcut: "/favicon.ico",
      apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
    })
    expect(metadata.other).toEqual({
      "apple-mobile-web-app-title": "Tennis Club Management",
    })
  })

  it("does not reuse another domain's metadata on successive requests", async () => {
    mockHeaders.mockResolvedValueOnce(new Headers({ host: "first.example" }))
      .mockResolvedValueOnce(new Headers({ host: "second.example" }))

    expect((await generateMetadata()).metadataBase?.origin).toBe("https://first.example")
    expect((await generateMetadata()).metadataBase?.origin).toBe("https://second.example")
  })

  it.each<Record<string, string>>([
    {},
    { host: "" },
    { host: "club.example", "x-forwarded-proto": "ftp" },
    { host: "club.example/path" },
    { host: "user:password@club.example" },
    { host: "club.example?query=1" },
    { host: "club.example#fragment" },
  ])("rejects missing or invalid request origins %j", async (values) => {
    mockHeaders.mockResolvedValue(new Headers(values))
    await expect(generateMetadata()).rejects.toThrow()
  })

  it("serves the branding favicon at the conventional root path", () => {
    expect(readFileSync(join(process.cwd(), "app/favicon.ico")))
      .toEqual(readFileSync(join(process.cwd(), "public/icons/favicon.ico")))
  })

  it.each([
    ["social-preview.png", 1200, 630],
    ["apple-touch-icon.png", 180, 180],
    ["icon.png", 160, 160],
  ])("declares the actual PNG dimensions for %s", (name, width, height) => {
    const png = readFileSync(join(process.cwd(), "public/icons", name))
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(png.readUInt32BE(16)).toBe(width)
    expect(png.readUInt32BE(20)).toBe(height)
  })
})
