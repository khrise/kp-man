import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import * as db from "./db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnAdmin = nextUrl.pathname.startsWith("/admin")

      if (isOnAdmin) {
        if (isLoggedIn) return true
        return false // Redirect unauthenticated users to login page
      }

      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        // @ts-expect-error - suppress type issues for now
        session.user.id = token.id
        // @ts-expect-error - suppress type issues for now
        session.user.username = token.username
      }
      return session
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          console.log("[AUTH] Missing credentials")
          return null
        }

        try {
          console.log(`[AUTH] Attempting to authenticate user: ${credentials.username}`)
          const user = await db.getUserByUsernameWithPassword(credentials.username as string)

          if (!user) {
            console.log("[AUTH] User not found in database")
            return null
          }

          console.log(`[AUTH] User found: ${user.username}, checking password...`)
          const isValidPassword = await bcrypt.compare(credentials.password as string, user.passwordHash)

          if (!isValidPassword) {
            console.log("[AUTH] Password validation failed")
            return null
          }

          console.log("[AUTH] Authentication successful")
          return {
            id: user.id.toString(),
            username: user.username,
            email: user.email,
          }
        } catch (error) {
          console.error("[AUTH] Auth error:", error)
          return null
        }
      },
    }),
  ],
})

export const { GET, POST } = handlers
