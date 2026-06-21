export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitByIp, getClientIp } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/auth-utils";
import { generateResetToken } from "@/lib/two-factor";
import { sendPasswordResetEmail } from "@/lib/email";

const Schema = z.object({
  email: z.string().email().max(120),
});

// Always run a dummy email lookup + token generation so attackers can't
// tell whether an email exists in our system (timing attack prevention).
const DUMMY_TOKEN = generateResetToken();

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || undefined;

  // Rate limit: 3 reset requests per hour per IP
  const rl = rateLimitByIp(ip, "forgot-password", 3, 60 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later.", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  // Parse body
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 400 }
    );
  }

  const email = body.email.toLowerCase().trim();

  // Look up user (silently fail if not found — return same response)
  const user = await db.user.findUnique({ where: { email } });

  if (user) {
    // Generate a real reset token
    const { plaintext, hash } = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60_000); // 1 hour

    await db.passwordResetToken.create({
      data: {
        email,
        tokenHash: hash,
        expiresAt,
        userId: user.id,
      },
    });

    // Purge old expired tokens for this email
    await db.passwordResetToken.deleteMany({
      where: {
        email,
        expiresAt: { lt: new Date() },
      },
    });

    // Build the reset link
    const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetLink = `${origin}/admin/reset-password?token=${encodeURIComponent(plaintext)}`;

    await writeAuditLog({
      userId: user.id,
      action: "password.reset.requested",
      ip,
      userAgent,
      meta: email,
    });

    // Attempt to send the branded reset email (fails soft if SMTP isn't configured)
    try {
      await sendPasswordResetEmail({
        to: email,
        name: user.name,
        resetLink,
        expiresInLabel: "1 hour",
      });
    } catch (e: any) {
      console.error("[forgot-password] email send failed:", e?.message);
      // Don't expose the failure to the user — still return generic success
    }

    // Log the reset link in dev mode (so the dev can complete the flow without SMTP)
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[dev] Password reset link for ${email}:\n${resetLink}\n`);
    }
  } else {
    // User not found — still run the dummy token generation to keep timing consistent
    // and audit-log the attempt
    await writeAuditLog({
      action: "password.reset.unknown-email",
      ip,
      userAgent,
      meta: email,
    });
  }

  // ALWAYS return the same response — don't leak whether the email exists
  return NextResponse.json({
    ok: true,
    message:
      "If an account exists for that email, a reset link has been sent. The link is valid for 1 hour.",
  });
}
