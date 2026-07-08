import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Edge-compatible middleware.
 *
 * Uses next-auth/jwt getToken() which runs in Edge Runtime (no bcrypt, no Prisma).
 * Full auth logic (credential verification, session creation) runs in Node.js
 * route handlers only, never in middleware.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass through static assets and internal routes immediately
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/uploads')
  ) {
    return NextResponse.next()
  }

  // ── 1. Extract Tenant Subdomain / Custom Domain ──────────────────
  const hostname = request.headers.get('host') ?? 'localhost:3000'
  const host = hostname.split(':')[0] ?? ''

  let subdomain = ''
  let customDomain = ''

  const rootDomains = ['localhost', 'adwyzors.com']
  let isRootDomain = false

  for (const root of rootDomains) {
    if (host.endsWith(root)) {
      isRootDomain = true
      const prefix = host.substring(0, host.length - root.length - 1)
      if (prefix && prefix !== 'www') {
        subdomain = prefix
      }
      break
    }
  }

  if (!isRootDomain) {
    customDomain = host
  }

  // Inject resolved tenant hints as headers for layouts and API routes
  const requestHeaders = new Headers(request.headers)
  if (subdomain) requestHeaders.set('x-tenant-subdomain', subdomain)
  if (customDomain) requestHeaders.set('x-tenant-custom-domain', customDomain)

  // ── 2. JWT Token Check (edge-compatible) ─────────────────────────
  // getToken reads the JWT from the session cookie without touching the DB.
  const token = await getToken({
    req: request,
    // eslint-disable-next-line no-restricted-syntax
    secret: process.env['AUTH_SECRET'] ?? '',
  })

  const isAuthRoute = pathname.startsWith('/login')
  const isSuperAdminRoute =
    pathname.startsWith('/tenants') ||
    pathname.startsWith('/billing') ||
    pathname.startsWith('/plans')

  // ── 3. Routing Logic ─────────────────────────────────────────────
  if (!token) {
    // Not authenticated
    if (!isAuthRoute) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Authenticated
  if (isAuthRoute) {
    // Already logged in — redirect away from login
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (isSuperAdminRoute && token['role'] !== 'SUPER_ADMIN') {
    // Insufficient role for super-admin routes
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)'],
}
