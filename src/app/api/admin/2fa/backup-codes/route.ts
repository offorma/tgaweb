import { NextResponse } from "next/server";
import { adminHandler, parseJsonBody } from "@/lib/admin-api";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  verifyTwoFactorToken,
  decryptTwoFactorSecret,
  generateBackupCodes,
  encryptBackupCodes,
} from "@/lib/two-factor";
import { verifyPassword, writeAuditLog } from "@/lib/auth-utils";

const Schema = z.object({
  password: z.string().min(1).max(200),
  totp: z.string().regex(/^\d{6}$/, "TOTP must be 6 digits").optional(),
});

/**
 * POST /api/admin/2fa/backup-codes
 * Regenerates the backup codes after verifying password + TOTP.
 *
 * Body: { password, totp }
 *
 * Returns the new backup codes (plaintext) ONCE.
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

  // Verify password
  if (!await verifyPassword(parsed.data.password, u.passwordHash)) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  // Verify TOTP
  if (!parsed.data.totp) {
    return NextResponse.json(
      { error: "A current TOTP code is required to regenerate backup codes." },
      { status: 400 }
    );
  }
  let secret: string;
  try {
    secret = decryptTwoFactorSecret(u.twoFactorSecret!);
  } catch {
    return NextResponse.json({ error: "Failed to decrypt 2FA secret." }, { status: 500 });
  }
  if (!verifyTwoFactorToken(parsed.data.totp, secret)) {
    return NextResponse.json({ error: "Invalid TOTP code." }, { status: 400 });
  }

  // Generate new backup codes
  const { plaintext, hashed } = generateBackupCodes();
  const encrypted = encryptBackupCodes(hashed);

  await db.user.update({
    where: { id: user.id },
    data: { twoFactorBackupCodes: encrypted },
  });

  await writeAuditLog({
    userId: user.id,
    action: "2fa.backup-codes.regenerated",
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: req.headers.get("user-agent") || undefined,
  });

  return NextResponse.json({
    ok: true,
    backupCodes: plaintext,
    message: "New backup codes generated. The old ones are no longer valid.",
  });
}, { method: "POST", requiredRole: "ADMIN" });
