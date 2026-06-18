import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { rateLimitByIp, getClientIp } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export type AdminUser = {
  id: string;
  email: string;
  name?: string;
  role: string;
};

// Roles in order of increasing privilege
const ROLE_LEVELS: Record<string, number> = {
  EDITOR: 1,
  ADMIN: 2,
};

// Regex for validating cuid-style IDs (Prisma default)
// cuid is 24 chars: lowercase letter + 23 base36 chars
export const CUID_REGEX = /^[a-z0-9]{20,30}$/i;

/**
 * Wraps an admin API handler with:
 *  - JWT auth check + role enforcement
 *  - Per-IP rate limiting
 *  - Audit logging of mutations
 *  - Safe error responses (no internal detail leakage)
 *  - Generic "Internal server error" message for unhandled exceptions
 *
 * Usage:
 *   // Default: requires ADMIN role
 *   export const POST = adminHandler(async (req, user) => { ... }, { method: "POST" });
 *
 *   // Allow EDITOR role (read-only content)
 *   export const GET = adminHandler(async (req, user) => { ... }, { method: "GET", requiredRole: "EDITOR" });
 */
export function adminHandler(
  fn: (req: NextRequest, user: AdminUser, ctx: { params?: any }) => Promise<NextResponse | Response>,
  opts: {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    limit?: number;
    windowMs?: number;
    requiredRole?: "ADMIN" | "EDITOR"; // default: ADMIN (most restrictive)
  } = {}
) {
  const requiredRole = opts.requiredRole ?? "ADMIN";
  const requiredLevel = ROLE_LEVELS[requiredRole] ?? 2;

  return async (req: NextRequest, ctx: any) => {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || undefined;

    // 1) Rate limit
    const rl = rateLimitByIp(
      ip,
      `admin:${opts.method || req.method}`,
      opts.limit ?? 60,
      opts.windowMs ?? 60_000
    );
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down.", retryAfter: rl.retryAfter },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    // 2) Auth — verify signed JWT
    const token = await getToken({
      req: req as any,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = String(token.role || "EDITOR"); // least-privilege default
    const userLevel = ROLE_LEVELS[userRole] ?? 1;

    // 3) Role enforcement — reject if user's role is below required
    if (userLevel < requiredLevel) {
      // Audit the denied access attempt
      await writeAuditLog({
        userId: String(token.sub || ""),
        action: `auth.denied.${req.method}.${new URL(req.url).pathname}`,
        ip,
        userAgent,
        meta: JSON.stringify({ requiredRole, userRole }),
      });
      return NextResponse.json(
        { error: "Forbidden — your role does not have access to this resource." },
        { status: 403 }
      );
    }

    const user: AdminUser = {
      id: String(token.sub || ""),
      email: String(token.email || ""),
      name: token.name || undefined,
      role: userRole,
    };

    // 4) Resolve params (Next.js 15+ params is a Promise)
    let resolvedParams: any = ctx?.params;
    if (resolvedParams && typeof resolvedParams.then === "function") {
      resolvedParams = await resolvedParams;
    }

    // 5) Run handler with safe error handling
    try {
      const result = await fn(req, user, { params: resolvedParams });
      // 6) Audit successful mutations
      if (opts.method && opts.method !== "GET") {
        await writeAuditLog({
          userId: user.id,
          action: `api.${opts.method.toLowerCase()}.${new URL(req.url).pathname}`,
          ip,
          userAgent,
        });
      }
      return result;
    } catch (e: any) {
      // Log the full error server-side for debugging
      console.error("[adminHandler]", e);

      // If it's an explicitly-thrown HTTP error with a statusCode, preserve it
      // but use the thrown message (these are intentional user-facing messages)
      if (e?.statusCode && typeof e.statusCode === "number") {
        return NextResponse.json(
          { error: e.message || "Request failed" },
          { status: e.statusCode }
        );
      }

      // For all other errors (Prisma errors, unexpected runtime errors),
      // return a generic message — never leak internal details
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Parse JSON body with a max size limit (default 1MB) to prevent abuse.
 */
export async function parseJsonBody<T = any>(
  req: NextRequest,
  maxBytes = 1_000_000
): Promise<T> {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    throw Object.assign(new Error("Request body too large"), { statusCode: 413 });
  }
  const text = await req.text();
  if (text.length > maxBytes) {
    throw Object.assign(new Error("Request body too large"), { statusCode: 413 });
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw Object.assign(new Error("Invalid JSON body"), { statusCode: 400 });
  }
}

/**
 * Validate that an ID is a cuid-format string. Returns true if valid.
 * Use this on every path-param ID before passing to Prisma.
 */
export function isValidId(id: unknown): id is string {
  return typeof id === "string" && CUID_REGEX.test(id);
}

/**
 * Strips potentially dangerous characters from string fields.
 * - Removes null bytes
 * - Trims whitespace
 * - Limits length
 */
export function sanitizeString(input: unknown, maxLength = 5000): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/\0/g, "")
    .slice(0, maxLength)
    .trim();
}
