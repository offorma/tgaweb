import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitByIp, getClientIp } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { writeAuditLog, hashPassword as bcryptHashPassword } from "@/lib/auth-utils";
import { hashToken } from "@/lib/two-factor";

const Schema = z.object({
  token: z.string().min(10).max(200),
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(200)
    .regex(/[A-Z]/, "Must include at least one uppercase letter")
    .regex(/[a-z]/, "Must include at least one lowercase letter")
    .regex(/[0-9]/, "Must include at least one digit")
    .regex(/[^A-Za-z0-9]/, "Must include at least one symbol"),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || undefined;

  // Rate limit: 10 reset attempts per hour per IP
  const rl = rateLimitByIp(ip, "reset-password", 10, 60 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later.", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  // Parse + validate
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json(
      { error: "Validation failed", details: e?.issues ?? "Invalid request" },
      { status: 400 }
    );
  }

  // Hash the provided token and look it up
  const tokenHash = hashToken(body.token);
  const resetRecord = await db.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  // Validate the token: must exist, not be used, not be expired
  if (
    !resetRecord ||
    resetRecord.usedAt ||
    resetRecord.expiresAt < new Date()
  ) {
    // Run a dummy bcrypt hash to keep timing consistent
    await bcryptHashPassword("dummy-password", 12);

    await writeAuditLog({
      action: "password.reset.invalid-token",
      ip,
      userAgent,
    });

    return NextResponse.json(
      {
        error:
          "This reset link is invalid, has already been used, or has expired. Please request a new one.",
      },
      { status: 400 }
    );
  }

  // Find the user
  const user = resetRecord.userId
    ? await db.user.findUnique({ where: { id: resetRecord.userId } })
    : await db.user.findUnique({ where: { email: resetRecord.email } });

  if (!user) {
    return NextResponse.json(
      { error: "Account not found. Please contact your site administrator." },
      { status: 400 }
    );
  }

  // Hash the new password
  const newHash = await bcryptHashPassword(body.newPassword);

  // Update the user's password AND mark the token as used
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        failedAttempts: 0,
        lockedUntil: null,
      },
    }),
    db.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
  ]);

  // Purge all other reset tokens for this user (defense in depth)
  await db.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  await writeAuditLog({
    userId: user.id,
    action: "password.reset.success",
    ip,
    userAgent,
  });

  return NextResponse.json({
    ok: true,
    message: "Password updated. You can now sign in with your new password.",
  });
}
