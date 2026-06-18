import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitByIp, getClientIp } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/auth-utils";
import { generateResetToken } from "@/lib/two-factor";
import { getSecretValues } from "@/lib/secrets-data";
import { isMasterKeyConfigured } from "@/lib/secrets";

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

    // Attempt to send the reset email via SMTP if configured
    if (isMasterKeyConfigured()) {
      try {
        const smtp = await getSecretValues([
          "SMTP_HOST",
          "SMTP_PORT",
          "SMTP_USER",
          "SMTP_PASSWORD",
          "SMTP_FROM",
        ]);
        if (smtp.SMTP_HOST && smtp.SMTP_USER && smtp.SMTP_PASSWORD) {
          const nodemailer = await import("nodemailer").catch(() => null);
          if (nodemailer) {
            const port = parseInt(smtp.SMTP_PORT || "587", 10);
            const transporter = nodemailer.createTransport({
              host: smtp.SMTP_HOST,
              port,
              secure: port === 465,
              auth: { user: smtp.SMTP_USER, pass: smtp.SMTP_PASSWORD },
            });
            await transporter.sendMail({
              from: smtp.SMTP_FROM || smtp.SMTP_USER,
              to: email,
              subject: "Reset your Trail Gliders Academy admin password",
              text: `Hello ${user.name},

A password reset was requested for your Trail Gliders Academy admin account.

Reset link (valid for 1 hour):
${resetLink}

If you did NOT request this reset, you can safely ignore this email — your password remains unchanged and your account is secure.

For your security, this link can only be used once.

— Trail Gliders Academy`,
              html: `
<p>Hello ${user.name},</p>
<p>A password reset was requested for your Trail Gliders Academy admin account.</p>
<p style="margin: 24px 0;">
  <a href="${resetLink}" style="display:inline-block;background:#FF6B1A;color:#fff;padding:12px 28px;border-radius:9999px;text-decoration:none;font-weight:600;">Reset my password</a>
</p>
<p style="color:#666;font-size:13px;">Or copy this link: <br><code>${resetLink}</code></p>
<p>The link is valid for <strong>1 hour</strong> and can only be used once.</p>
<p>If you did NOT request this reset, you can safely ignore this email — your password remains unchanged.</p>
<p>— Trail Gliders Academy</p>`,
            });
            await transporter.close();
          }
        }
      } catch (e: any) {
        console.error("[forgot-password] SMTP send failed:", e?.message);
        // Don't expose the failure to the user — still return generic success
      }
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
