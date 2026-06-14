import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/settings",
  "/account",
  "/transfer",
  "/analytics",
  "/debts",
  "/notifications",
  "/assets",
  "/liabilities",
  "/add-account",
]

const AUTH_ROUTES = new Set(["/login", "/register"])

function isProtectedRoute(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
  request,
})

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          } catch (error) {
            console.error("[middleware] cookie set error:", error)
          }
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  let user = null

  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    user = authUser
  } catch (error: any) {
    if (error?.status === 429 || error?.message?.toLowerCase?.().includes("rate limit")) {
      console.warn("[middleware] Supabase rate limited, skipping auth redirect logic")
      return response
    }

    console.error("[middleware] auth error:", error?.message || error)
  }

  if (isProtectedRoute(pathname) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirectedFrom", pathname)
    return NextResponse.redirect(url)
  }

  if (AUTH_ROUTES.has(pathname) && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|api|sitemap.xml|robots.txt).*)",
  ],
}
