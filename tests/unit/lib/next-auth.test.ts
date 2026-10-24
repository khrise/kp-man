/**
 * @jest-environment node
 */
import NextAuth from "next-auth"
import { NextRequest } from "next/server"
import "@/lib/next-auth"

jest.mock("next-auth", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    handlers: { GET: jest.fn(), POST: jest.fn() },
    auth: jest.fn(), signIn: jest.fn(), signOut: jest.fn(),
  })),
}))
jest.mock("next-auth/providers/credentials", () => ({
  __esModule: true,
  default: jest.fn((options: unknown) => options),
}))
jest.mock("@/lib/db", () => ({}))

const config = jest.mocked(NextAuth).mock.calls[0][0]
if (typeof config === "function") throw new Error("Expected a static auth configuration")
const { jwt, authorized } = config.callbacks ?? {}
if (!jwt || !authorized) throw new Error("Expected auth callbacks")

const user = { id: "7", username: "admin", email: "admin@example.com", emailVerified: null }

it("keeps the credential user's string ID in the token", async () => {
  const token = await jwt({ token: {}, user, account: null })
  expect(token).toMatchObject({ id: "7", username: "admin" })
})

it("allows anonymous users to reach the login page", async () => {
  expect(await authorized({
    auth: null, request: new NextRequest("http://localhost/admin/login"),
  })).toBe(true)
})

it("allows signed-in non-admins to reach the login page to switch accounts", async () => {
  expect(await authorized({
    auth: { user: { ...user, username: "player" }, expires: "2099-01-01" },
    request: new NextRequest("http://localhost/admin/login"),
  })).toBe(true)
})

it("rejects anonymous admin navigation at the authentication layer", async () => {
  expect(await authorized({
    auth: null, request: new NextRequest("http://localhost/admin/dashboard"),
  })).toBe(false)
})
