/**
 * Two-Factor Authentication (TOTP) + Password Reset utilities.
 *
 * 2FA follows the standard TOTP algorithm (RFC 6238) — compatible with
 * Google Authenticator, Authy, 1Password, Microsoft Authenticator, etc.
 *
 * Uses otplib v13's functional API (generate, verify, generateURI, generateSecret).
 *
 * Backup codes are 10 single-use codes, hashed with bcrypt before storage.
 * They allow account recovery if the authenticator device is lost.
 */

import {
  generateSecret,
  generateSync,
  verifySync,
  generateURI,
} from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { encryptSecret, decryptSecret, isMasterKeyConfigured } from "@/lib/secrets";

export const TOTP_ISSUER = "Trail Gliders Academy";

// TOTP config: 6 digits, 30-second period, SHA-1 (the TOTP standard).
// We allow 1 step of drift (±30s) via the epochTolerance option in verifySync.
const TOTP_CONFIG = {
  digits: 6,
  period: 30,
  algorithm: "sha1" as const,
};

/**
 * Generate a new random base32 TOTP secret (20 bytes by default).
 */
export function generateTwoFactorSecret(): string {
  return generateSecret({ length: 20 });
}

/**
 * Build the otpauth:// URI that QR-code generators expect.
 */
export function buildOtpauthUri(email: string, secret: string): string {
  return generateURI({
    strategy: "totp",
    issuer: TOTP_ISSUER,
    label: email,
    secret,
    algorithm: TOTP_CONFIG.algorithm,
    digits: TOTP_CONFIG.digits,
    period: TOTP_CONFIG.period,
  });
}

/**
 * Generate a QR code as a data URL (PNG base64) for the given otpauth URI.
 */
export async function generateQrCodeDataUrl(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, {
    width: 240,
    margin: 1,
    color: { dark: "#0A1F44", light: "#FFFFFF" }, // brand navy on white
    errorCorrectionLevel: "M",
  });
}

/**
 * Verify a 6-digit TOTP code against the secret.
 * Allows ±1 time step (±30 seconds) of drift to handle clock skew.
 */
export function verifyTwoFactorToken(token: string, secret: string): boolean {
  try {
    const cleaned = token.replace(/\s/g, "");
    if (!/^\d{6}$/.test(cleaned)) return false;
    const result = verifySync({
      strategy: "totp",
      token: cleaned,
      secret,
      digits: TOTP_CONFIG.digits,
      period: TOTP_CONFIG.period,
      algorithm: TOTP_CONFIG.algorithm,
      epochTolerance: 1, // allow ±1 step
    });
    return result.valid === true;
  } catch (e) {
    console.error("[totp] verify failed:", e);
    return false;
  }
}

/**
 * (Optional) Generate the current TOTP code for a secret.
 * Useful for testing — never expose to the client.
 */
export function generateCurrentTotp(secret: string): string {
  return generateSync({
    strategy: "totp",
    secret,
    digits: TOTP_CONFIG.digits,
    period: TOTP_CONFIG.period,
    algorithm: TOTP_CONFIG.algorithm,
  });
}

/**
 * Generate 10 random backup codes. Returns them as plaintext (to show user once)
 * AND as bcrypt-hashed (for storage).
 *
 * Format: XXXX-XXXX (8 alphanumeric chars, easy to read/write)
 */
export function generateBackupCodes(): {
  plaintext: string[];
  hashed: string[];
} {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars (0/O, 1/I)
  const plaintext: string[] = [];
  const hashed: string[] = [];

  for (let i = 0; i < 10; i++) {
    let code = "";
    for (let j = 0; j < 8; j++) {
      code += chars[Math.floor(crypto.randomBytes(1)[0] / 256 * chars.length)];
    }
    const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
    plaintext.push(formatted);
    hashed.push(bcrypt.hashSync(formatted, 10));
  }

  return { plaintext, hashed };
}

/**
 * Verify a backup code against the list of hashed codes.
 * Returns the index of the matched code, or -1 if no match.
 */
export function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): number {
  const cleaned = code.trim().toUpperCase();
  for (let i = 0; i < hashedCodes.length; i++) {
    try {
      if (bcrypt.compareSync(cleaned, hashedCodes[i])) {
        return i;
      }
    } catch {
      // skip malformed hashes
    }
  }
  return -1;
}

/**
 * Encrypt a TOTP secret before storing it in the DB.
 * Uses the same AES-256-GCM master key as the Secrets Vault.
 */
export function encryptTwoFactorSecret(secret: string): string {
  if (!isMasterKeyConfigured()) {
    throw new Error("Cannot encrypt 2FA secret: SECRETS_MASTER_KEY not set");
  }
  return encryptSecret(secret).ciphertext;
}

/**
 * Decrypt a stored TOTP secret.
 */
export function decryptTwoFactorSecret(encrypted: string): string {
  return decryptSecret(encrypted);
}

/**
 * Encrypt backup codes (as JSON array of hashes) before storing.
 */
export function encryptBackupCodes(hashedCodes: string[]): string {
  if (!isMasterKeyConfigured()) {
    throw new Error("Cannot encrypt backup codes: SECRETS_MASTER_KEY not set");
  }
  return encryptSecret(JSON.stringify(hashedCodes)).ciphertext;
}

/**
 * Decrypt backup codes.
 */
export function decryptBackupCodes(encrypted: string): string[] {
  try {
    const json = decryptSecret(encrypted);
    return JSON.parse(json) as string[];
  } catch {
    return [];
  }
}

// ============ Password Reset ============

/**
 * Generate a cryptographically secure password-reset token.
 * Returns the plaintext token (sent to the user via email)
 * AND its SHA-256 hash (stored in the DB).
 */
export function generateResetToken(): { plaintext: string; hash: string } {
  // 32 random bytes → base64url → ~43 chars
  const bytes = crypto.randomBytes(32);
  const plaintext = bytes.toString("base64url");
  const hash = hashToken(plaintext);
  return { plaintext, hash };
}

/**
 * Hash a reset token with SHA-256 for storage.
 * (No salt needed — the token itself is already high-entropy.)
 */
export function hashToken(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}

/**
 * Constant-time-ish comparison of two hex strings.
 */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
