import { Pool } from "pg"
import { setupTestDatabase, truncateAllTables, TestDatabaseContext } from "../../../helpers/db-test-harness"
import {
  createUser,
  getUsers,
  getUserById,
  getUserByUsername,
  getUserByUsernameWithPassword,
  getUsersWithPlayerInfo,
  updateUser,
  updateUserPassword,
  deleteUser,
  createPlayer,
} from "@/lib/db"

let ctx: TestDatabaseContext

beforeAll(async () => {
  ctx = await setupTestDatabase()
})

afterAll(async () => {
  await ctx.cleanup()
})

beforeEach(async () => {
  await truncateAllTables(ctx.pool as unknown as Pool)
})

const baseUser = {
  username: "testuser",
  passwordHash: "$2b$10$hashedpassword",
  email: "test@example.com",
  role: "admin" as const,
  playerId: null,
}

describe("createUser", () => {
  it("creates and returns a user", async () => {
    const user = await createUser(baseUser)
    expect(user.id).toBeDefined()
    expect(user.username).toBe("testuser")
    expect(user.email).toBe("test@example.com")
    expect(user.role).toBe("admin")
  })

  it("rejects duplicate username", async () => {
    await createUser(baseUser)
    await expect(createUser({ ...baseUser, email: "other@example.com" })).rejects.toThrow()
  })

  it("rejects duplicate email", async () => {
    await createUser(baseUser)
    await expect(createUser({ ...baseUser, username: "otheruser" })).rejects.toThrow()
  })
})

describe("getUsers", () => {
  it("returns empty array when no users exist", async () => {
    expect(await getUsers()).toEqual([])
  })

  it("returns all users ordered by username", async () => {
    await createUser({ ...baseUser, username: "zara", email: "zara@example.com" })
    await createUser({ ...baseUser, username: "anna", email: "anna@example.com" })
    const users = await getUsers()
    expect(users[0].username).toBe("anna")
    expect(users[1].username).toBe("zara")
  })
})

describe("getUserById", () => {
  it("returns the user for a valid id", async () => {
    const user = await createUser(baseUser)
    const found = await getUserById(user.id)
    expect(found?.id).toBe(user.id)
  })

  it("returns undefined for a non-existent id", async () => {
    expect(await getUserById(99999)).toBeUndefined()
  })
})

describe("getUserByUsername", () => {
  it("returns the user for an exact username match", async () => {
    await createUser(baseUser)
    const found = await getUserByUsername("testuser")
    expect(found?.username).toBe("testuser")
  })

  it("is case-insensitive", async () => {
    await createUser(baseUser)
    const found = await getUserByUsername("TESTUSER")
    expect(found?.username).toBe("testuser")
  })

  it("returns undefined for an unknown username", async () => {
    expect(await getUserByUsername("nobody")).toBeUndefined()
  })
})

describe("getUserByUsernameWithPassword", () => {
  it("returns the user including passwordHash", async () => {
    await createUser(baseUser)
    const found = await getUserByUsernameWithPassword("testuser")
    expect(found?.passwordHash).toBe("$2b$10$hashedpassword")
  })

  it("returns undefined for an unknown username", async () => {
    expect(await getUserByUsernameWithPassword("nobody")).toBeUndefined()
  })
})

describe("getUsersWithPlayerInfo", () => {
  it("returns users with null player fields when no player is linked", async () => {
    await createUser(baseUser)
    const list = await getUsersWithPlayerInfo()
    expect(list).toHaveLength(1)
    expect(list[0].playerFirstName).toBeNull()
  })

  it("returns user with linked player name", async () => {
    const player = await createPlayer({ firstName: "Anna", lastName: "Müller" })
    await createUser({ ...baseUser, playerId: player.id })
    const list = await getUsersWithPlayerInfo()
    expect(list[0].playerFirstName).toBe("Anna")
    expect(list[0].playerLastName).toBe("Müller")
  })
})

describe("updateUser", () => {
  it("updates user fields", async () => {
    const user = await createUser(baseUser)
    const updated = await updateUser(user.id, { username: "newname", email: "new@example.com", role: "user", playerId: null })
    expect(updated?.username).toBe("newname")
    expect(updated?.role).toBe("user")
  })

  it("returns undefined for a non-existent user", async () => {
    expect(await updateUser(99999, { username: "x", email: "x@x.com", role: "user", playerId: null })).toBeUndefined()
  })
})

describe("updateUserPassword", () => {
  it("updates the password hash without returning a value", async () => {
    const user = await createUser(baseUser)
    await expect(updateUserPassword(user.id, "$2b$10$newhash")).resolves.not.toThrow()
    const found = await getUserByUsernameWithPassword("testuser")
    expect(found?.passwordHash).toBe("$2b$10$newhash")
  })
})

describe("deleteUser", () => {
  it("deletes an existing user", async () => {
    const user = await createUser(baseUser)
    await deleteUser(user.id)
    expect(await getUserById(user.id)).toBeUndefined()
  })

  it("resolves silently for a non-existent user", async () => {
    await expect(deleteUser(99999)).resolves.not.toThrow()
  })
})
