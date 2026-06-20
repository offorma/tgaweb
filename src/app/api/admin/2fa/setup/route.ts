export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminHandler } from "@/lib/admin-api";
import { db } from "@/lib/db";
import {
  generateTwoFactorSecret,
  buildOtpauthUri,
  generateQrCodeDataUrl,
} from "@/lib/two-factor";
import { writeAuditLog } from "@/lib/auth-utils";

/**
 * POST /api/admin/2fa/setup
 * Generates a new TOTP secret + QR code for the current user.
 * The secret is NOT yet stored — the user must verify a code first
 * (via /enable) to confirm their authenticator app is set up correctly.
 *
 * Returns:
 *  - secret: base32 secret (shown to user as fallback for manual entry)
 *  - qrCode: data URL of QR code
 *  - otpauth: the otpauth:// URI
 */
export const POST = adminHandler(async (req, user) => {
  // If 2FA already enabled, refuse (must disable first)
  const u = await db.user.findUnique({ where: { id: user.id } });
  if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (u.twoFactorEnabled) {
    return NextResponse.json(
      { error: "2FA is already enabled. Disable it first to re-setup." },
      { status: 400 }
    );
  }

  // Generate a new secret
  const secret = generateTwoFactorSecret();
  const otpauth = buildOtpauthUri(user.email, secret);
  const qrCode = await generateQrCodeDataUrl(otpauth);

  await writeAuditLog({
    userId: user.id,
    action: "2fa.setup.initiated",
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: req.headers.get("user-agent") || undefined,
  });

  return NextResponse.json({
    secret,
    qrCode,
    otpauth,
  });
}, { method: "POST", requiredRole: "ADMIN" });
