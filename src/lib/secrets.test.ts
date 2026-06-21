import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

/**
 * Backend unit tests for src/lib/secrets.ts.
 *
 * The module derives its AES-256-GCM key from process.env.SECRETS_MASTER_KEY,
 * so each test sets/restores that env var. We exercise:
 *  - master-key validation (missing / too short / present)
 *  - encrypt → decrypt round-trips and preview hints
 *  - GCM tamper detection and malformed-ciphertext errors
 *  - rotateMasterKey (mocked db.secret delegate)
 *  - generateRandomSecret entropy/format
 *  - testSmtpConnection (mocked nodemailer)
 */

const h = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
  verify: vi.fn(),
  close: vi.fn(),
  createTransport: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { secret: { findMany: h.findMany, update: h.update } },
}));

vi.mock("nodemailer", () => ({
  default: { createTransport: h.createTransport },
  createTransport: h.createTransport,
}));

import {
  getMasterKey,
  isMasterKeyConfigured,
  encryptSecret,
  decryptSecret,
  rotateMasterKey,
  generateRandomSecret,
  testSmtpConnection,
} from "@/lib/secrets";

const ORIGINAL = process.env.SECRETS_MASTER_KEY;
const GOOD_KEY = "this-is-a-good-master-key-32chars";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SECRETS_MASTER_KEY = GOOD_KEY;
  h.createTransport.mockReturnValue({ verify: h.verify, close: h.close });
  h.verify.mockResolvedValue(true);
  h.close.mockResolvedValue(undefined);
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.SECRETS_MASTER_KEY;
  else process.env.SECRETS_MASTER_KEY = ORIGINAL;
});

describe("getMasterKey() / isMasterKeyConfigured()", () => {
  it("returns a 32-byte key (SHA-256 of the env var)", () => {
    const key = getMasterKey();
    expect(key).toHaveLength(32);
    expect(key).toEqual(crypto.createHash("sha256").update(GOOD_KEY).digest());
  });

  it("throws when env var is missing", () => {
    delete process.env.SECRETS_MASTER_KEY;
    expect(() => getMasterKey()).toThrow(/missing or too short/);
    expect(isMasterKeyConfigured()).toBe(false);
  });

  it("throws when env var is too short (< 16 chars)", () => {
    process.env.SECRETS_MASTER_KEY = "short";
    expect(() => getMasterKey()).toThrow();
    expect(isMasterKeyConfigured()).toBe(false);
  });

  it("isMasterKeyConfigured returns true when valid", () => {
    expect(isMasterKeyConfigured()).toBe(true);
  });
});

describe("encryptSecret() / decryptSecret()", () => {
  it("round-trips a value", () => {
    const { ciphertext } = encryptSecret("hello world");
    expect(decryptSecret(ciphertext)).toBe("hello world");
  });

  it("produces 3 dot-separated base64 parts", () => {
    const { ciphertext } = encryptSecret("abc");
    expect(ciphertext.split(".")).toHaveLength(3);
  });

  it("uses a random IV — same plaintext encrypts differently each time", () => {
    const a = encryptSecret("same").ciphertext;
    const b = encryptSecret("same").ciphertext;
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("same");
    expect(decryptSecret(b)).toBe("same");
  });

  it("sets previewHint to last 4 chars when length >= 4", () => {
    expect(encryptSecret("password").previewHint).toBe("word");
    expect(encryptSecret("abcd").previewHint).toBe("abcd");
  });

  it("sets previewHint to null when length < 4", () => {
    expect(encryptSecret("ab").previewHint).toBeNull();
    expect(encryptSecret("").previewHint).toBeNull();
  });

  it("round-trips unicode and empty strings", () => {
    expect(decryptSecret(encryptSecret("").ciphertext)).toBe("");
    expect(decryptSecret(encryptSecret("héllo 🌍").ciphertext)).toBe("héllo 🌍");
  });

  it("throws on malformed ciphertext (wrong part count)", () => {
    expect(() => decryptSecret("onlyonepart")).toThrow(/Malformed ciphertext/);
    expect(() => decryptSecret("a.b")).toThrow(/Malformed ciphertext/);
  });

  it("throws on a tampered auth tag (GCM integrity check)", () => {
    const { ciphertext } = encryptSecret("secret");
    const [iv, data, tag] = ciphertext.split(".");
    const badTag = Buffer.from(tag, "base64");
    badTag[0] ^= 0xff;
    const tampered = [iv, data, badTag.toString("base64")].join(".");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("throws on a tampered ciphertext body", () => {
    const { ciphertext } = encryptSecret("secret");
    const [iv, data, tag] = ciphertext.split(".");
    const badData = Buffer.from(data, "base64");
    badData[0] ^= 0xff;
    const tampered = [iv, badData.toString("base64"), tag].join(".");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("throws on a bad IV length", () => {
    const { ciphertext } = encryptSecret("secret");
    const [, data, tag] = ciphertext.split(".");
    const shortIv = Buffer.alloc(8).toString("base64");
    expect(() => decryptSecret([shortIv, data, tag].join("."))).toThrow(
      /Bad IV length/
    );
  });

  it("throws on a bad auth tag length", () => {
    const { ciphertext } = encryptSecret("secret");
    const [iv, data] = ciphertext.split(".");
    const shortTag = Buffer.alloc(8).toString("base64");
    expect(() => decryptSecret([iv, data, shortTag].join("."))).toThrow(
      /Bad auth tag length/
    );
  });

  it("cannot decrypt with a different master key", () => {
    const { ciphertext } = encryptSecret("secret");
    process.env.SECRETS_MASTER_KEY = "a-completely-different-master-key!";
    expect(() => decryptSecret(ciphertext)).toThrow();
  });

  it("encryptSecret throws when master key not configured", () => {
    delete process.env.SECRETS_MASTER_KEY;
    expect(() => encryptSecret("x")).toThrow(/missing or too short/);
  });
});

describe("rotateMasterKey()", () => {
  it("re-encrypts all valid secrets with the new key and counts them", async () => {
    const oldKey = "old-master-key-at-least-16chars";
    const newKey = "new-master-key-at-least-16chars";

    // Encrypt a couple of secrets under the OLD key directly.
    process.env.SECRETS_MASTER_KEY = oldKey;
    const c1 = encryptSecret("value-one").ciphertext;
    const c2 = encryptSecret("value-two").ciphertext;
    // restore the good key (rotate derives keys from its args, not env)
    process.env.SECRETS_MASTER_KEY = GOOD_KEY;

    h.findMany.mockResolvedValue([
      { id: "s1", ciphertext: c1 },
      { id: "s2", ciphertext: c2 },
      { id: "s3", ciphertext: "malformed-skip-me" }, // wrong part count → skipped
    ]);
    h.update.mockResolvedValue({});

    const count = await rotateMasterKey(oldKey, newKey);
    expect(count).toBe(2);
    expect(h.update).toHaveBeenCalledTimes(2);

    // The new ciphertext must decrypt under newKey
    const newCipher = h.update.mock.calls[0][0].data.ciphertext;
    process.env.SECRETS_MASTER_KEY = newKey;
    expect(decryptSecret(newCipher)).toBe("value-one");
    expect(h.update.mock.calls[0][0].data.lastRotatedAt).toBeInstanceOf(Date);
  });

  it("returns 0 when there are no secrets", async () => {
    h.findMany.mockResolvedValue([]);
    const count = await rotateMasterKey("old-key-16-characters!", "new-key-16-characters!");
    expect(count).toBe(0);
    expect(h.update).not.toHaveBeenCalled();
  });
});

describe("generateRandomSecret()", () => {
  it("returns a string of the requested length by default (32)", () => {
    const s = generateRandomSecret();
    expect(s).toHaveLength(32);
  });

  it("honors a custom length", () => {
    expect(generateRandomSecret(16)).toHaveLength(16);
  });

  it("strips +, / and = characters", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateRandomSecret(40)).not.toMatch(/[+/=]/);
    }
  });

  it("produces different secrets across calls", () => {
    expect(generateRandomSecret()).not.toBe(generateRandomSecret());
  });
});

describe("testSmtpConnection()", () => {
  it("returns ok when verify succeeds", async () => {
    const res = await testSmtpConnection({
      host: "smtp.test",
      port: 587,
      user: "u",
      password: "p",
    });
    expect(res.ok).toBe(true);
    expect(res.message).toContain("smtp.test:587");
    expect(h.createTransport.mock.calls[0][0]).toMatchObject({
      host: "smtp.test",
      port: 587,
      secure: false,
    });
    expect(h.close).toHaveBeenCalled();
  });

  it("defaults secure to true for port 465", async () => {
    await testSmtpConnection({ host: "h", port: 465, user: "u", password: "p" });
    expect(h.createTransport.mock.calls[0][0].secure).toBe(true);
  });

  it("honors an explicit secure flag", async () => {
    await testSmtpConnection({
      host: "h",
      port: 587,
      user: "u",
      password: "p",
      secure: true,
    });
    expect(h.createTransport.mock.calls[0][0].secure).toBe(true);
  });

  it("returns the error message when verify rejects", async () => {
    h.verify.mockRejectedValue(new Error("auth failed"));
    const res = await testSmtpConnection({
      host: "h",
      port: 587,
      user: "u",
      password: "p",
    });
    expect(res.ok).toBe(false);
    expect(res.message).toBe("auth failed");
  });

  it("uses a generic message when the thrown error has no message", async () => {
    h.verify.mockRejectedValue({});
    const res = await testSmtpConnection({
      host: "h",
      port: 587,
      user: "u",
      password: "p",
    });
    expect(res.ok).toBe(false);
    expect(res.message).toBe("SMTP connection failed");
  });

  it("reports nodemailer-not-installed when the dynamic import fails", async () => {
    // Force the lazy `import("nodemailer").catch(() => null)` to take the null path.
    vi.resetModules();
    vi.doMock("nodemailer", () => {
      throw new Error("Cannot find module 'nodemailer'");
    });
    const mod = await import("@/lib/secrets");
    const res = await mod.testSmtpConnection({
      host: "h",
      port: 587,
      user: "u",
      password: "p",
    });
    expect(res.ok).toBe(false);
    expect(res.message).toContain("nodemailer is not installed");
    vi.doUnmock("nodemailer");
    vi.resetModules();
  });
});
