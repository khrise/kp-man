export interface AuthUser {
  id: number
  username: string
  email: string
}

const MOCK_ADMIN = {
  id: 1,
  username: "admin",
  email: "admin@sportsclub.com",
  password: "admin123", // In production, this would be hashed
}

export async function login(username: string, password: string): Promise<AuthUser | null> {
  // Mock authentication - replace with real database query
  if (username === MOCK_ADMIN.username && password === MOCK_ADMIN.password) {
    return {
      id: MOCK_ADMIN.id,
      username: MOCK_ADMIN.username,
      email: MOCK_ADMIN.email,
    }
  }
  return null
}

export async function logout(): Promise<void> {
  // Clear session
}

export function isAuthenticated(): boolean {
  // Check if user is authenticated
  // In a real app, this would check session/token
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_user") !== null
  }
  return false
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("auth_user")
    if (userStr) {
      return JSON.parse(userStr)
    }
  }
  return null
}

export function setCurrentUser(user: AuthUser): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_user", JSON.stringify(user))
  }
}

export function clearCurrentUser(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_user")
  }
}
