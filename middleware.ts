import { NextResponse } from "next/server"
import { auth } from "@/lib/next-auth"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth")
  const isAdminRoute = nextUrl.pathname.startsWith("/admin")
  const isAdminLoginPage = nextUrl.pathname === "/admin/login"

  // Allow API auth routes
  if (isApiAuthRoute) {
    return NextResponse.next()
  }

  // Redirect logged-in users away from login page
  if (isAdminLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/dashboard", nextUrl))
  }

  // Protect admin routes
  if (isAdminRoute && !isLoggedIn && !isAdminLoginPage) {
    return NextResponse.redirect(new URL("/admin/login", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}
