import { NextResponse } from "next/server"
import { auth } from "@/lib/next-auth"

// Auth.js rewrites req.nextUrl's origin to AUTH_URL/NEXTAUTH_URL when set, which
// would redirect to another instance (e.g. prod). Derive the origin from the request.
function requestUrl(path: string, req: Request, fallback: URL) {
  const headers = req.headers
  const host = headers.get("x-forwarded-host") ?? headers.get("host")
  if (!host) return new URL(path, fallback)
  const proto = headers.get("x-forwarded-proto")?.split(",")[0].trim() ?? fallback.protocol.replace(":", "")
  return new URL(path, `${proto}://${host.split(",")[0].trim()}`)
}

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
    return NextResponse.redirect(requestUrl("/admin/dashboard", req, nextUrl))
  }

  // Authentication is an early filter; server pages and actions enforce the current admin role.
  if (isAdminRoute && !isLoggedIn && !isAdminLoginPage) {
    return NextResponse.redirect(requestUrl("/admin/login", req, nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}
