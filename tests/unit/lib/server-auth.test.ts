/**
 * @jest-environment node
 */
import { AuthorizationError, requireAdmin, requireAdminPage } from "@/lib/server/auth"
import { auth } from "@/lib/next-auth"
import { getUserById } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import type { User } from "@/lib/db"
import type { Session } from "next-auth"

jest.mock("server-only", () => ({}), { virtual: true })
jest.mock("@/lib/next-auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/db", () => ({ getUserById: jest.fn() }))
jest.mock("next/navigation", () => ({
  redirect: jest.fn(() => { throw new Error("REDIRECT") }),
  notFound: jest.fn(() => { throw new Error("NOT_FOUND") }),
}))

const mockAuth = jest.mocked<() => Promise<Session | null>>(auth)
const mockGetUser = jest.mocked(getUserById)
const admin: User = {
  id: 7,
  username: "admin",
  email: "admin@example.com",
  role: "admin",
  passwordHash: "test-hash",
  playerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { id: "7", username: "admin", email: admin.email }, expires: "2099-01-01" })
  mockGetUser.mockResolvedValue(admin)
})

describe("requireAdmin", () => {
  it("resolves the session user by ID and returns the current admin", async () => {
    await expect(requireAdmin()).resolves.toEqual(admin)
    expect(mockGetUser).toHaveBeenCalledWith(7)
  })

  it("rejects anonymous users without querying the database", async () => {
    mockAuth.mockResolvedValue(null)
    await expect(requireAdmin()).rejects.toMatchObject({ status: 401 })
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it.each(["", "NaN", "0", "-1", "1.5", "9007199254740992"])("rejects invalid session ID %j", async (id) => {
    mockAuth.mockResolvedValue({ user: { id, username: "admin", email: admin.email }, expires: "2099-01-01" })
    await expect(requireAdmin()).rejects.toBeInstanceOf(AuthorizationError)
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it.each(["user", "player", "team_captain"] as const)("rejects the current %s role", async (role) => {
    mockGetUser.mockResolvedValue({ ...admin, role })
    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 })
  })

  it("rejects a deleted user", async () => {
    mockGetUser.mockResolvedValue(undefined)
    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 })
  })

  it("rechecks the database role for the same session after demotion", async () => {
    await expect(requireAdmin()).resolves.toEqual(admin)
    mockGetUser.mockResolvedValue({ ...admin, role: "player" })
    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 })
    expect(mockGetUser).toHaveBeenCalledTimes(2)
  })

  it("propagates database errors instead of granting access", async () => {
    mockGetUser.mockRejectedValueOnce(new Error("Database unavailable"))
    await expect(requireAdmin()).rejects.toThrow("Database unavailable")
  })
})

describe("requireAdminPage", () => {
  it("allows an admin", async () => {
    await expect(requireAdminPage()).resolves.toEqual(admin)
    expect(redirect).not.toHaveBeenCalled()
    expect(notFound).not.toHaveBeenCalled()
  })

  it("redirects an anonymous visitor to the login page", async () => {
    mockAuth.mockResolvedValue(null)
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT")
    expect(redirect).toHaveBeenCalledWith("/admin/login")
  })

  it("returns not found for a signed-in non-admin", async () => {
    mockGetUser.mockResolvedValue({ ...admin, role: "player" })
    await expect(requireAdminPage()).rejects.toThrow("NOT_FOUND")
    expect(notFound).toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it("does not mask unexpected failures as access denials", async () => {
    mockGetUser.mockRejectedValueOnce(new Error("Database unavailable"))
    await expect(requireAdminPage()).rejects.toThrow("Database unavailable")
    expect(notFound).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })
})
