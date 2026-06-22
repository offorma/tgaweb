export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitByIp, getClientIp } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, writeAuditLog } from "@/lib/auth-utils";
import { getToken } from "next-auth/jwt";

const Schema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z
    .string()
    .min(12, "New password must be at least 12 characters")
    .max(200)
    .regex(/[A-Z]/, "Must include at least one uppercase letter")
    .regex(/[a-z]/, "Must include at least one lowercase letter")
    .regex(/[0-9]/, "Must include at least one digit")
    .regex(/[^A-Za-z0-9]/, "Must include at least one symbol"),
});

export async function POST(req: NextRequest) {
  // 1) Rate limit (5 attempts per 15 min per IP)
  const ip = getClientIp(req);
  const rl = rateLimitByIp(ip, "admin:change-password", 5, 15 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later.", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  // 2) Auth
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET, cookieName: "next-auth.session-token" });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3) Parse + validate
  let body: z.infer<typeof Schema>;
  try {
    const raw = await req.json();
    body = Schema.parse(raw);
  } catch (e: any) {
    return NextResponse.json(
      { error: "Validation failed", details: e?.issues ?? "Invalid request" },
      { status: 400 }
    );
  }

  // 4) Confirm current password
  const user = await db.user.findUnique({ where: { id: String(token.sub) } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const ok = await verifyPassword(body.currentPassword, user.passwordHash);
  if (!ok) {
    await writeAuditLog({
      userId: user.id,
      action: "password.change.failed",
      ip,
      userAgent: req.headers.get("user-agent") || undefined,
    });
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  // 5) Disallow reuse
  if (await verifyPassword(body.newPassword, user.passwordHash)) {
    return NextResponse.json(
      { error: "New password cannot be the same as the current password" },
      { status: 400 }
    );
  }

  // 6) Update — also clear the "must change password" flag and any lockout, so
  // a forced first-login password change releases the account.
  const newHash = await hashPassword(body.newPassword);
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
      failedAttempts: 0,
      lockedUntil: null,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "password.change.success",
    ip,
    userAgent: req.headers.get("user-agent") || undefined,
  });

  return NextResponse.json({ ok: true });
}
