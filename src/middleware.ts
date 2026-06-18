import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_PATH = "/admin";
const LOGIN_PATH = "/admin/login";
const API_ADMIN_PATH = "/api/admin";

// Routes under /admin that don't require auth
const PUBLIC_ADMIN_PATHS = new Set([
  LOGIN_PATH,
  "/admin/forgot-password",
  "/admin/reset-password",
  "/admin/2fa-verify",
]);

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const res = NextResponse.next();

  // 1) Add security headers to every response
  applySecurityHeaders(res);

  // 2) Protect /admin pages and /api/admin/* routes
  const isAdminPage = pathname === ADMIN_PATH || pathname.startsWith(`${ADMIN_PATH}/`);
  const isAdminApi = pathname.startsWith(API_ADMIN_PATH);

  if (isAdminPage || isAdminApi) {
    // Public admin pages (login) — skip auth
    if (PUBLIC_ADMIN_PATHS.has(pathname)) {
      return res;
    }

    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      // API requests get JSON 401; page requests redirect to login
      if (isAdminApi) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = LOGIN_PATH;
      loginUrl.searchParams.set("from", pathname + search);
      return NextResponse.redirect(loginUrl);
    }

    // Inject user info into request headers for downstream API routes
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-admin-user-id", String(token.sub || ""));
    requestHeaders.set("x-admin-user-email", String(token.email || ""));
    requestHeaders.set("x-admin-user-role", String(token.role || "ADMIN"));

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return res;
}

function applySecurityHeaders(res: NextResponse) {
  // Prevent clickjacking
  res.headers.set("X-Frame-Options", "DENY");
  // Prevent MIME-type sniffing
  res.headers.set("X-Content-Type-Options", "nosniff");
  // Referrer policy
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Restrict powerful browser features
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );
  // HSTS — enforce HTTPS (1 year, include subdomains, preload-list eligible)
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  // Content Security Policy — strict but allows Next.js inline styles & images
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ")
  );
  // Cross-origin policies
  res.headers.set("X-DNS-Prefetch-Control", "off");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("X-Permitted-Cross-Domain-Policies", "none");
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, favicon
     * - public assets (images, crest, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|crest|images|logo.svg|robots.txt).*)",
  ],
};
