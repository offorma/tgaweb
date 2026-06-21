import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Backend unit tests for src/lib/two-factor.ts.
 *
 * Strategy:
 *  - Use the REAL otplib (deterministic TOTP) and the REAL crypto/bcrypt so the
 *    token-generation ↔ verification round-trips are exercised end-to-end.
 *  - Mock QRCode (no canvas/PNG work needed).
 *  - For the encrypt/decrypt helpers, use the REAL @/lib/secrets module with a
 *    valid SECRETS_MASTER_KEY set in env, plus a not-configured branch by
 *    unsetting it.
 */

const h = vi.hoisted(() => ({
  toDataURL: vi.fn(),
}));

vi.mock("qrcode", () => ({
  default: { toDataURL: h.toDataURL },
  toDataURL: h.toDataURL,
}));

import {
  TOTP_ISSUER,
  generateTwoFactorSecret,
  buildOtpauthUri,
  generateQrCodeDataUrl,
  verifyTwoFactorToken,
  generateCurrentTotp,
  generateBackupCodes,
  verifyBackupCode,
  encryptTwoFactorSecret,
  decryptTwoFactorSecret,
  encryptBackupCodes,
  decryptBackupCodes,
  generateResetToken,
  hashToken,
  safeEqualHex,
} from "@/lib/two-factor";
import { decryptSecret } from "@/lib/secrets";

const ORIGINAL = process.env.SECRETS_MASTER_KEY;
const GOOD_KEY = "two-factor-master-key-long-enough";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SECRETS_MASTER_KEY = GOOD_KEY;
  h.toDataURL.mockResolvedValue("data:image/png;base64,QR");
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.SECRETS_MASTER_KEY;
  else process.env.SECRETS_MASTER_KEY = ORIGINAL;
});

describe("generateTwoFactorSecret()", () => {
  it("generates a non-empty base32 secret", () => {
    const s = generateTwoFactorSecret();
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(0);
    expect(generateTwoFactorSecret()).not.toBe(s); // random
  });
});

describe("buildOtpauthUri()", () => {
  it("builds a totp otpauth URI with issuer + label", () => {
    const secret = generateTwoFactorSecret();
    const uri = buildOtpauthUri("admin@school.test", secret);
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain(encodeURIComponent(TOTP_ISSUER));
    expect(uri).toContain(`secret=${secret}`);
    expect(uri).toContain(`issuer=${encodeURIComponent(TOTP_ISSUER)}`);
  });
});

describe("generateQrCodeDataUrl()", () => {
  it("delegates to QRCode.toDataURL with brand styling", async () => {
    const out = await generateQrCodeDataUrl("otpauth://totp/x");
    expect(out).toBe("data:image/png;base64,QR");
    expect(h.toDataURL).toHaveBeenCalledWith(
      "otpauth://totp/x",
      expect.objectContaining({
        width: 240,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#0A1F44", light: "#FFFFFF" },
      })
    );
  });
});

describe("generateCurrentTotp() + verifyTwoFactorToken()", () => {
  it("a freshly generated token verifies against its secret", () => {
    const secret = generateTwoFactorSecret();
    const token = generateCurrentTotp(secret);
    expect(token).toMatch(/^\d{6}$/);
    expect(verifyTwoFactorToken(token, secret)).toBe(true);
  });

  it("tolerates surrounding whitespace in the token", () => {
    const secret = generateTwoFactorSecret();
    const token = generateCurrentTotp(secret);
    expect(verifyTwoFactorToken(` ${token.slice(0, 3)} ${token.slice(3)} `, secret)).toBe(
      true
    );
  });

  it("rejects a token that is not 6 digits", () => {
    const secret = generateTwoFactorSecret();
    expect(verifyTwoFactorToken("123", secret)).toBe(false);
    expect(verifyTwoFactorToken("abcdef", secret)).toBe(false);
    expect(verifyTwoFactorToken("1234567", secret)).toBe(false);
  });

  it("rejects a wrong-but-well-formed token", () => {
    const secret = generateTwoFactorSecret();
    const token = generateCurrentTotp(secret);
    const wrong = token === "000000" ? "111111" : "000000";
    expect(verifyTwoFactorToken(wrong, secret)).toBe(false);
  });

  it("returns false (caught) when the secret is invalid", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(verifyTwoFactorToken("123456", "not-a-valid-base32-!!!")).toBe(false);
    spy.mockRestore();
  });
});

describe("generateBackupCodes()", () => {
  it("returns 10 plaintext codes in XXXX-XXXX format and 10 hashes", () => {
    const { plaintext, hashed } = generateBackupCodes();
    expect(plaintext).toHaveLength(10);
    expect(hashed).toHaveLength(10);
    for (const code of plaintext) {
      expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    }
    for (const hashOut of hashed) {
      expect(hashOut.startsWith("$2")).toBe(true);
    }
  });

  it("each hash verifies against its own plaintext code", () => {
    const { plaintext, hashed } = generateBackupCodes();
    expect(verifyBackupCode(plaintext[0], hashed)).toBe(0);
    expect(verifyBackupCode(plaintext[3], hashed)).toBe(3);
  });
});

describe("verifyBackupCode()", () => {
  it("matches case-insensitively and trims input", () => {
    const { plaintext, hashed } = generateBackupCodes();
    const idx = 5;
    expect(verifyBackupCode(`  ${plaintext[idx].toLowerCase()}  `, hashed)).toBe(idx);
  });

  it("returns -1 when no code matches", () => {
    const { hashed } = generateBackupCodes();
    expect(verifyBackupCode("ZZZZ-ZZZZ", hashed)).toBe(-1);
  });

  it("skips malformed hashes without throwing", () => {
    const { plaintext, hashed } = generateBackupCodes();
    const mixed = ["not-a-bcrypt-hash", hashed[2]];
    expect(verifyBackupCode(plaintext[2], mixed)).toBe(1);
  });

  it("returns -1 against an empty hash list", () => {
    expect(verifyBackupCode("AAAA-BBBB", [])).toBe(-1);
  });
});

describe("encrypt/decrypt 2FA secret", () => {
  it("round-trips a secret through the vault", () => {
    const secret = generateTwoFactorSecret();
    const enc = encryptTwoFactorSecret(secret);
    expect(enc).not.toBe(secret);
    expect(decryptTwoFactorSecret(enc)).toBe(secret);
    // sanity: it is the vault format
    expect(decryptSecret(enc)).toBe(secret);
  });

  it("throws when master key not configured", () => {
    delete process.env.SECRETS_MASTER_KEY;
    expect(() => encryptTwoFactorSecret("x")).toThrow(/SECRETS_MASTER_KEY not set/);
  });
});

describe("encrypt/decrypt backup codes", () => {
  it("round-trips the hashed array", () => {
    const { hashed } = generateBackupCodes();
    const enc = encryptBackupCodes(hashed);
    expect(decryptBackupCodes(enc)).toEqual(hashed);
  });

  it("throws when master key not configured", () => {
    delete process.env.SECRETS_MASTER_KEY;
    expect(() => encryptBackupCodes(["a"])).toThrow(/SECRETS_MASTER_KEY not set/);
  });

  it("returns [] when decryption fails", () => {
    expect(decryptBackupCodes("garbage")).toEqual([]);
  });

  it("returns [] when decrypted payload is not valid JSON", () => {
    // Encrypt a non-JSON string via the real vault, then decrypt as codes.
    const enc = encryptTwoFactorSecret("not-json-at-all");
    expect(decryptBackupCodes(enc)).toEqual([]);
  });
});

describe("generateResetToken() / hashToken()", () => {
  it("returns a base64url plaintext and its sha256 hash", () => {
    const { plaintext, hash } = generateResetToken();
    expect(plaintext).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(plaintext)).toBe(hash);
  });

  it("produces unique tokens", () => {
    expect(generateResetToken().plaintext).not.toBe(generateResetToken().plaintext);
  });

  it("hashToken is deterministic", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });
});

describe("safeEqualHex()", () => {
  it("returns true for equal hex strings", () => {
    const a = hashToken("token");
    expect(safeEqualHex(a, a)).toBe(true);
  });

  it("returns false for different hex strings of equal length", () => {
    const a = hashToken("token-a");
    const b = hashToken("token-b");
    expect(safeEqualHex(a, b)).toBe(false);
  });

  it("returns false for unequal lengths (short-circuit)", () => {
    expect(safeEqualHex("aa", "aabb")).toBe(false);
  });
});
