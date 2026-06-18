/**
 * Secrets vault — AES-256-GCM encryption with master key from env var.
 *
 * Design:
 * - Master key: SHA-256 of SECRETS_MASTER_KEY env var → 32 bytes (AES-256)
 * - Per-secret IV: 12 random bytes (recommended for GCM)
 * - Auth tag: 16 bytes (GCM integrity check)
 * - Storage format: `${base64(iv)}.${base64(ciphertext)}.${base64(authTag)}`
 *
 * The plaintext value is NEVER stored. The DB only ever sees the ciphertext.
 * The master key lives only in the cPanel environment variable, never in code/git/DB.
 */

import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Returns the 32-byte AES-256 key derived from the SECRETS_MASTER_KEY env var.
 * Throws if the env var is missing — the admin UI should detect this state and
 * show a setup banner.
 */
export function getMasterKey(): Buffer {
  const raw = process.env.SECRETS_MASTER_KEY;
  if (!raw || raw.length < 16) {
    throw new Error(
      "SECRETS_MASTER_KEY environment variable is missing or too short (need at least 16 chars). Set it in cPanel → Setup Node.js App → Environment Variables."
    );
  }
  return crypto.createHash("sha256").update(raw).digest();
}

export function isMasterKeyConfigured(): boolean {
  try {
    getMasterKey();
    return true;
  } catch {
    return false;
  }
}

export interface EncryptedPayload {
  ciphertext: string;
  previewHint: string | null;
}

/**
 * Encrypt a plaintext string.
 * Returns the storage-format ciphertext and a preview hint (last 4 chars).
 */
export function encryptSecret(plaintext: string): EncryptedPayload {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: [
      iv.toString("base64"),
      encrypted.toString("base64"),
      authTag.toString("base64"),
    ].join("."),
    previewHint: plaintext.length >= 4 ? plaintext.slice(-4) : null,
  };
}

/**
 * Decrypt a ciphertext payload. Throws on tampering (GCM auth tag check).
 */
export function decryptSecret(ciphertext: string): string {
  const key = getMasterKey();
  const parts = ciphertext.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed ciphertext (expected 3 dot-separated parts)");
  }
  const [ivB64, dataB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");

  if (iv.length !== IV_LENGTH) throw new Error("Bad IV length");
  if (authTag.length !== TAG_LENGTH) throw new Error("Bad auth tag length");

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * Re-encrypt ALL secrets with a new master key. Used by the key-rotation flow.
 * Returns the count of re-encrypted secrets.
 */
export async function rotateMasterKey(
  oldKey: string,
  newKey: string
): Promise<number> {
  // Lazy import to avoid circular dependency in some bundlers
  const { db } = await import("@/lib/db");

  const oldKeyBuf = crypto.createHash("sha256").update(oldKey).digest();
  const newKeyBuf = crypto.createHash("sha256").update(newKey).digest();

  const secrets = await db.secret.findMany();
  let count = 0;

  for (const s of secrets) {
    // Decrypt with old key
    const parts = s.ciphertext.split(".");
    if (parts.length !== 3) continue;
    const [ivB64, dataB64, tagB64] = parts;
    const iv = Buffer.from(ivB64, "base64");
    const encrypted = Buffer.from(dataB64, "base64");
    const authTag = Buffer.from(tagB64, "base64");
    const decipher = crypto.createDecipheriv(ALGO, oldKeyBuf, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");

    // Re-encrypt with new key
    const newIv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGO, newKeyBuf, newIv);
    const newEncrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const newAuthTag = cipher.getAuthTag();
    const newCiphertext = [
      newIv.toString("base64"),
      newEncrypted.toString("base64"),
      newAuthTag.toString("base64"),
    ].join(".");

    await db.secret.update({
      where: { id: s.id },
      data: {
        ciphertext: newCiphertext,
        lastRotatedAt: new Date(),
      },
    });
    count++;
  }

  return count;
}

/**
 * Generate a strong random secret of the given length (default 32 chars).
 * Useful for things like NEXTAUTH_SECRET, API keys, etc.
 */
export function generateRandomSecret(length = 32): string {
  const bytes = crypto.randomBytes(length);
  return bytes
    .toString("base64")
    .replace(/[+/=]/g, "")
    .slice(0, length);
}

/**
 * Test SMTP credentials by attempting a connection (without sending email).
 * Returns success or an error message.
 */
export async function testSmtpConnection(opts: {
  host: string;
  port: number;
  user: string;
  password: string;
  secure?: boolean;
}): Promise<{ ok: boolean; message: string }> {
  try {
    // Use nodemailer only when called — lazy import
    const nodemailer = await import("nodemailer").catch(() => null);
    if (!nodemailer) {
      return {
        ok: false,
        message:
          "nodemailer is not installed. Run: bun add nodemailer && bun add -d @types/nodemailer",
      };
    }
    const transporter = nodemailer.createTransport({
      host: opts.host,
      port: opts.port,
      secure: opts.secure ?? opts.port === 465,
      auth: { user: opts.user, pass: opts.password },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
    await transporter.verify();
    await transporter.close();
    return { ok: true, message: `Connected to ${opts.host}:${opts.port} successfully.` };
  } catch (e: any) {
    return { ok: false, message: e?.message || "SMTP connection failed" };
  }
}
