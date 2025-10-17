"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import * as db from "@/lib/db"

export async function getUsers() {
  return await db.getUsersWithPlayerInfo()
}

export async function createUserAction(formData: FormData) {
  const username = formData.get("username") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const role = formData.get("role") as "admin" | "user" | "team_captain" | "player"
  const playerIdStr = formData.get("player_id") as string

  if (!username || !email || !password || !role) {
    throw new Error("Missing required fields")
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12)

  // Parse player ID if provided
  const playerId = playerIdStr && playerIdStr !== "" ? Number(playerIdStr) : null

  const data = {
    username,
    email,
    passwordHash,
    role,
    playerId,
  }

  await db.createUser(data)
  revalidatePath("/admin/users")
  return { success: true }
}

export async function updateUserAction(id: string, formData: FormData) {
  const userId = Number(id)
  if (Number.isNaN(userId)) {
    throw new Error("Invalid user id")
  }

  const username = formData.get("username") as string
  const email = formData.get("email") as string
  const role = formData.get("role") as "admin" | "user" | "team_captain" | "player"
  const playerIdStr = formData.get("player_id") as string

  if (!username || !email || !role) {
    throw new Error("Missing required fields")
  }

  // Parse player ID if provided
  const playerId = playerIdStr && playerIdStr !== "" ? Number(playerIdStr) : null

  const data = {
    username,
    email,
    role,
    playerId,
  }

  await db.updateUser(userId, data)
  revalidatePath("/admin/users")
  return { success: true }
}

export async function updateUserPasswordAction(id: string, formData: FormData) {
  const userId = Number(id)
  if (Number.isNaN(userId)) {
    throw new Error("Invalid user id")
  }

  const password = formData.get("password") as string
  if (!password) {
    throw new Error("Password is required")
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12)

  await db.updateUserPassword(userId, passwordHash)
  revalidatePath("/admin/users")
  return { success: true }
}

export async function deleteUserAction(id: string) {
  const userId = Number(id)
  if (Number.isNaN(userId)) {
    throw new Error("Invalid user id")
  }

  await db.deleteUser(userId)
  revalidatePath("/admin/users")
  return { success: true }
}
