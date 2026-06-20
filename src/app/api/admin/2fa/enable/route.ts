export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminHandler, parseJsonBody } from "@/lib/admin-api";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  verifyTwoFactorToken,
  generateBackupCodes,
  encryptTwoFactorSecret,
  encryptBackupCodes,
} from "@/lib/two-factor";
import { writeAuditLog } from "@/lib/auth-utils";

const Schema = z.object({
  secret: z.string().min(16, "Missing secret"),
  token: z.string().regex(/^\d{6}$/, "Token must be 6 digits"),
});

/**
 * POST /api/admin/2fa/enable
 * Verifies the first TOTP code from the user's authenticator app,
 * then enables 2FA + stores the encrypted secret + generates backup codes.
 *
 * Body: { secret, token }
 *
 * Returns the backup codes (plaintext) ONCE for the user to save.
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
  if (u.twoFactorEnabled) {
    return NextResponse.json(
      { error: "2FA is already enabled." },
      { status: 400 }
    );
  }

  // Verify the TOTP token against the secret
  if (!verifyTwoFactorToken(parsed.data.token, parsed.data.secret)) {
    return NextResponse.json(
      { error: "Invalid verification code. Please try again." },
      { status: 400 }
    );
  }

  // Generate 10 backup codes
  const { plaintext, hashed } = generateBackupCodes();

  // Encrypt the secret + backup codes for storage
  const encryptedSecret = encryptTwoFactorSecret(parsed.data.secret);
  const encryptedBackupCodes = encryptBackupCodes(hashed);

  await db.user.update({
    where: { id: user.id },
    data: {
      twoFactorSecret: encryptedSecret,
      twoFactorEnabled: true,
      twoFactorBackupCodes: encryptedBackupCodes,
      twoFactorEnabledAt: new Date(),
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "2fa.enabled",
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: req.headers.get("user-agent") || undefined,
  });

  return NextResponse.json({
    ok: true,
    backupCodes: plaintext, // shown once — user must save them
    message:
      "2FA enabled. Save these backup codes in a secure location — each can be used once if you lose your authenticator device.",
  });
}, { method: "POST", requiredRole: "ADMIN" });
