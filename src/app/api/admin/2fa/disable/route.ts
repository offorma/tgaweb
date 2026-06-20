export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminHandler, parseJsonBody } from "@/lib/admin-api";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyTwoFactorToken, decryptTwoFactorSecret, decryptBackupCodes, verifyBackupCode } from "@/lib/two-factor";
import { verifyPassword, writeAuditLog } from "@/lib/auth-utils";
import { encryptBackupCodes } from "@/lib/two-factor";

const Schema = z.object({
  password: z.string().min(1).max(200),
  totp: z.string().optional(), // 6-digit code OR backup code (XXXX-XXXX)
});

/**
 * POST /api/admin/2fa/disable
 * Disables 2FA after verifying the current password + a valid TOTP/backup code.
 *
 * Body: { password, totp }
 *
 * This double verification prevents an attacker with a stolen session
 * from disabling 2FA.
 */
export const POST = adminHandler(async (req, user) => {
  const body = await parseJsonBody(req);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const u = await db.user.findUnique({ where: { id: user.id } });
  if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!u.twoFactorEnabled) {
    return NextResponse.json({ error: "2FA is not enabled." }, { status: 400 });
  }

  // 1) Verify current password
  if (!await verifyPassword(parsed.data.password, u.passwordHash)) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 400 }
    );
  }

  // 2) Verify TOTP or backup code
  if (!parsed.data.totp) {
    return NextResponse.json(
      { error: "A 2FA code is required to disable 2FA." },
      { status: 400 }
    );
  }

  const encryptedSecret = u.twoFactorSecret!;
  const encryptedBackupCodes = u.twoFactorBackupCodes!;
  let verified = false;

  // Try as TOTP first
  try {
    const secret = decryptTwoFactorSecret(encryptedSecret);
    if (verifyTwoFactorToken(parsed.data.totp, secret)) {
      verified = true;
    }
  } catch {
    // ignore decryption errors
  }

  // Try as backup code if TOTP didn't match
  if (!verified) {
    try {
      const hashedCodes = decryptBackupCodes(encryptedBackupCodes);
      const idx = verifyBackupCode(parsed.data.totp, hashedCodes);
      if (idx >= 0) {
        // Remove the used backup code
        const remaining = hashedCodes.filter((_, i) => i !== idx);
        const reencrypted = encryptBackupCodes(remaining);
        await db.user.update({
          where: { id: user.id },
          data: { twoFactorBackupCodes: reencrypted },
        });
        verified = true;
      }
    } catch {
      // ignore
    }
  }

  if (!verified) {
    return NextResponse.json(
      { error: "Invalid 2FA code. Please try again." },
      { status: 400 }
    );
  }

  // Disable 2FA
  await db.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
      twoFactorEnabledAt: null,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "2fa.disabled",
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: req.headers.get("user-agent") || undefined,
  });

  return NextResponse.json({
    ok: true,
    message: "2FA has been disabled. Your account is now protected by password only.",
  });
}, { method: "POST", requiredRole: "ADMIN" });
