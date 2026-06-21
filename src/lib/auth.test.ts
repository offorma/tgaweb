import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for src/lib/auth.ts (NextAuth options).
 * We exercise the Credentials provider's authorize() across every branch
 * (bad input, user-not-found, inactive, locked, 2FA paths) plus the
 * jwt / session / authorized callbacks.
 *
 * Boundaries mocked: @/lib/db, @/lib/auth-utils, @/lib/two-factor.
 */
const h = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  policyFindUnique: vi.fn(),
  verifyPassword: vi.fn(),
  recordFailedLogin: vi.fn(),
  recordSuccessfulLogin: vi.fn(),
  getLockoutRemaining: vi.fn(),
  writeAuditLog: vi.fn(),
  verifyTwoFactorToken: vi.fn(),
  decryptTwoFactorSecret: vi.fn(),
  decryptBackupCodes: vi.fn(),
  verifyBackupCode: vi.fn(),
  encryptBackupCodes: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: h.userFindUnique, update: h.userUpdate },
    securityPolicy: { findUnique: h.policyFindUnique },
  },
}));
vi.mock("@/lib/auth-utils", () => ({
  verifyPassword: h.verifyPassword,
  recordFailedLogin: h.recordFailedLogin,
  recordSuccessfulLogin: h.recordSuccessfulLogin,
  getLockoutRemaining: h.getLockoutRemaining,
  writeAuditLog: h.writeAuditLog,
}));
vi.mock("@/lib/two-factor", () => ({
  verifyTwoFactorToken: h.verifyTwoFactorToken,
  decryptTwoFactorSecret: h.decryptTwoFactorSecret,
  decryptBackupCodes: h.decryptBackupCodes,
  verifyBackupCode: h.verifyBackupCode,
  encryptBackupCodes: h.encryptBackupCodes,
}));

import { authOptions } from "./auth";

const provider: any = authOptions.providers[0];
const authorize = provider.options.authorize as (
  creds: any,
  req: any
) => Promise<any>;

const baseReq = {
  headers: {
    get: (k: string) => {
      if (k === "x-forwarded-for") return "10.0.0.1, 10.0.0.2";
      if (k === "user-agent") return "Mozilla/5.0";
      return null;
    },
  },
};

function baseUser(overrides: Record<string, any> = {}) {
  return {
    id: "u1",
    email: "admin@school.test",
    name: "Admin",
    role: "ADMIN",
    passwordHash: "hash",
    isActive: true,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorBackupCodes: null,
    mustEnable2FA: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.verifyPassword.mockResolvedValue(true);
  h.getLockoutRemaining.mockResolvedValue(0);
  h.policyFindUnique.mockResolvedValue(null);
  h.recordFailedLogin.mockResolvedValue(undefined);
  h.recordSuccessfulLogin.mockResolvedValue(undefined);
  h.writeAuditLog.mockResolvedValue(undefined);
  h.userUpdate.mockResolvedValue(undefined);
});

describe("authorize — input validation", () => {
  it("returns null when credentials are missing", async () => {
    expect(await authorize(undefined, baseReq)).toBeNull();
    expect(await authorize({ email: "a@b.com" }, baseReq)).toBeNull();
    expect(await authorize({ password: "password1" }, baseReq)).toBeNull();
  });

  it("returns null + audits an invalid email format", async () => {
    const res = await authorize(
      { email: "not-an-email", password: "password1" },
      baseReq
    );
    expect(res).toBeNull();
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "login.invalid-email" })
    );
  });

  it("returns null + audits a too-short password", async () => {
    const res = await authorize(
      { email: "a@b.com", password: "short" },
      baseReq
    );
    expect(res).toBeNull();
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "login.short-password" })
    );
  });

  it("derives ip from x-real-ip when x-forwarded-for is absent", async () => {
    const req = {
      headers: {
        get: (k: string) =>
          k === "x-real-ip" ? "5.5.5.5" : k === "user-agent" ? "UA" : null,
      },
    };
    h.userFindUnique.mockResolvedValue(null);
    await authorize({ email: "a@b.com", password: "password1" }, req);
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "login.failed", ip: "5.5.5.5" })
    );
  });

  it("falls back to 'unknown' ip/ua when no headers", async () => {
    h.userFindUnique.mockResolvedValue(null);
    await authorize({ email: "a@b.com", password: "password1" }, {});
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ ip: "unknown", userAgent: "unknown" })
    );
  });
});

describe("authorize — credentials check", () => {
  it("returns null when the user is not found (runs dummy hash)", async () => {
    h.userFindUnique.mockResolvedValue(null);
    const res = await authorize(
      { email: "a@b.com", password: "password1" },
      baseReq
    );
    expect(res).toBeNull();
    expect(h.verifyPassword).toHaveBeenCalled();
    expect(h.recordFailedLogin).not.toHaveBeenCalled();
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "login.failed" })
    );
  });

  it("returns null + records failed login when password mismatches", async () => {
    h.userFindUnique.mockResolvedValue(baseUser());
    h.verifyPassword.mockResolvedValue(false);
    const res = await authorize(
      { email: "admin@school.test", password: "password1" },
      baseReq
    );
    expect(res).toBeNull();
    expect(h.recordFailedLogin).toHaveBeenCalledWith("u1");
  });

  it("returns null + audits when the account is inactive", async () => {
    h.userFindUnique.mockResolvedValue(baseUser({ isActive: false }));
    const res = await authorize(
      { email: "admin@school.test", password: "password1" },
      baseReq
    );
    expect(res).toBeNull();
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "login.inactive" })
    );
  });

  it("returns null + audits when the account is locked", async () => {
    h.userFindUnique.mockResolvedValue(baseUser());
    h.getLockoutRemaining.mockResolvedValue(120);
    const res = await authorize(
      { email: "admin@school.test", password: "password1" },
      baseReq
    );
    expect(res).toBeNull();
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "login.locked" })
    );
  });
});

describe("authorize — 2FA policy enforcement", () => {
  it("flags mustEnable2FA for an ADMIN when policy enforces it and 2FA is off", async () => {
    h.userFindUnique.mockResolvedValue(baseUser({ twoFactorEnabled: false }));
    h.policyFindUnique.mockResolvedValue({ enforceTwoFactorForAdmins: true });
    const res = await authorize(
      { email: "admin@school.test", password: "password1" },
      baseReq
    );
    expect(res).toMatchObject({ id: "u1", role: "ADMIN" });
    expect(h.userUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { mustEnable2FA: true },
    });
  });

  it("flags mustEnable2FA for an EDITOR when policy enforces it", async () => {
    h.userFindUnique.mockResolvedValue(
      baseUser({ role: "EDITOR", twoFactorEnabled: false })
    );
    h.policyFindUnique.mockResolvedValue({ enforceTwoFactorForEditors: true });
    await authorize(
      { email: "admin@school.test", password: "password1" },
      baseReq
    );
    expect(h.userUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { mustEnable2FA: true },
    });
  });
});

describe("authorize — 2FA verification", () => {
  const userWith2FA = () =>
    baseUser({
      twoFactorEnabled: true,
      twoFactorSecret: "enc-secret",
      twoFactorBackupCodes: "enc-codes",
    });

  it("throws 2FA_REQUIRED when no code is provided", async () => {
    h.userFindUnique.mockResolvedValue(userWith2FA());
    await expect(
      authorize({ email: "admin@school.test", password: "password1" }, baseReq)
    ).rejects.toMatchObject({ code: "2FA_REQUIRED" });
  });

  it("succeeds with a valid TOTP code", async () => {
    h.userFindUnique.mockResolvedValue(userWith2FA());
    h.decryptTwoFactorSecret.mockReturnValue("plain-secret");
    h.verifyTwoFactorToken.mockReturnValue(true);
    const res = await authorize(
      { email: "admin@school.test", password: "password1", totp: "123456" },
      baseReq
    );
    expect(res).toMatchObject({ id: "u1" });
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "login.2fa.success" })
    );
  });

  it("fails when a 6-digit TOTP does not verify (no backup codes)", async () => {
    h.userFindUnique.mockResolvedValue(
      baseUser({ twoFactorEnabled: true, twoFactorSecret: "enc", twoFactorBackupCodes: null })
    );
    h.decryptTwoFactorSecret.mockReturnValue("plain");
    h.verifyTwoFactorToken.mockReturnValue(false); // TOTP mismatch
    const res = await authorize(
      { email: "admin@school.test", password: "password1", totp: "000000" },
      baseReq
    );
    expect(res).toBeNull();
    expect(h.recordFailedLogin).toHaveBeenCalledWith("u1");
  });

  it("fails a backup-format code when the account has no stored backup codes", async () => {
    h.userFindUnique.mockResolvedValue(
      baseUser({ twoFactorEnabled: true, twoFactorSecret: "enc", twoFactorBackupCodes: null })
    );
    const res = await authorize(
      { email: "admin@school.test", password: "password1", totp: "abcd-1234" },
      baseReq
    );
    expect(res).toBeNull();
    expect(h.decryptBackupCodes).not.toHaveBeenCalled();
  });

  it("tolerates a decryption error during TOTP and falls through to fail", async () => {
    h.userFindUnique.mockResolvedValue(
      baseUser({ twoFactorEnabled: true, twoFactorSecret: "enc", twoFactorBackupCodes: null })
    );
    h.decryptTwoFactorSecret.mockImplementation(() => {
      throw new Error("decrypt fail");
    });
    const res = await authorize(
      { email: "admin@school.test", password: "password1", totp: "123456" },
      baseReq
    );
    expect(res).toBeNull();
    expect(h.recordFailedLogin).toHaveBeenCalledWith("u1");
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "login.2fa.failed" })
    );
  });

  it("succeeds with a valid backup code and consumes it", async () => {
    h.userFindUnique.mockResolvedValue(userWith2FA());
    h.decryptBackupCodes.mockReturnValue(["code0", "code1", "code2"]);
    h.verifyBackupCode.mockReturnValue(1);
    h.encryptBackupCodes.mockReturnValue("re-enc");
    const res = await authorize(
      { email: "admin@school.test", password: "password1", totp: "abcd-1234" },
      baseReq
    );
    expect(res).toMatchObject({ id: "u1" });
    expect(h.encryptBackupCodes).toHaveBeenCalledWith(["code0", "code2"]);
    expect(h.userUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { twoFactorBackupCodes: "re-enc" },
    });
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "login.2fa.backup-code-used" })
    );
  });

  it("tolerates a backup-code decryption error and fails", async () => {
    h.userFindUnique.mockResolvedValue(userWith2FA());
    h.decryptBackupCodes.mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await authorize(
      { email: "admin@school.test", password: "password1", totp: "abcd-1234" },
      baseReq
    );
    expect(res).toBeNull();
  });

  it("fails when backup code does not match (idx < 0)", async () => {
    h.userFindUnique.mockResolvedValue(userWith2FA());
    h.decryptBackupCodes.mockReturnValue(["x"]);
    h.verifyBackupCode.mockReturnValue(-1);
    const res = await authorize(
      { email: "admin@school.test", password: "password1", totp: "abcd-1234" },
      baseReq
    );
    expect(res).toBeNull();
  });

  it("fails when an invalid-format 2FA code is given", async () => {
    h.userFindUnique.mockResolvedValue(userWith2FA());
    const res = await authorize(
      { email: "admin@school.test", password: "password1", totp: "!!!" },
      baseReq
    );
    expect(res).toBeNull();
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "login.2fa.failed" })
    );
  });
});

describe("authorize — full success (no 2FA)", () => {
  it("records the successful login and returns the user identity", async () => {
    h.userFindUnique.mockResolvedValue(baseUser());
    const res = await authorize(
      { email: "admin@school.test", password: "password1" },
      baseReq
    );
    expect(res).toEqual({
      id: "u1",
      email: "admin@school.test",
      name: "Admin",
      role: "ADMIN",
    });
    expect(h.recordSuccessfulLogin).toHaveBeenCalledWith("u1");
    expect(h.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "login.success" })
    );
  });
});

describe("callbacks", () => {
  const cb: any = authOptions.callbacks;

  it("jwt copies user fields onto the token", async () => {
    const token = await cb.jwt({
      token: {},
      user: {
        id: "u1",
        role: "ADMIN",
        mustEnable2FA: true,
        mustChangePassword: false,
      },
    });
    expect(token).toMatchObject({
      id: "u1",
      role: "ADMIN",
      mustEnable2FA: true,
      mustChangePassword: false,
    });
  });

  it("jwt returns the token unchanged when there is no user", async () => {
    const token = await cb.jwt({ token: { existing: 1 } });
    expect(token).toEqual({ existing: 1 });
  });

  it("session copies token fields onto session.user", async () => {
    const session = await cb.session({
      session: { user: {} },
      token: { id: "u1", role: "EDITOR", mustEnable2FA: false, mustChangePassword: true },
    });
    expect(session.user).toMatchObject({
      id: "u1",
      role: "EDITOR",
      mustChangePassword: true,
    });
  });

  it("session passes through when there is no session.user", async () => {
    const session = await cb.session({ session: {}, token: { id: "x" } });
    expect(session).toEqual({});
  });

  it("authorized blocks unauthenticated access to /admin", async () => {
    const block = await cb.authorized({
      auth: null,
      request: { nextUrl: { pathname: "/admin/dashboard" } },
    });
    expect(block).toBe(false);
    const allow = await cb.authorized({
      auth: { user: {} },
      request: { nextUrl: { pathname: "/admin/dashboard" } },
    });
    expect(allow).toBe(true);
  });

  it("authorized allows the login page and public paths", async () => {
    expect(
      await cb.authorized({
        auth: null,
        request: { nextUrl: { pathname: "/admin/login" } },
      })
    ).toBe(true);
    expect(
      await cb.authorized({
        auth: null,
        request: { nextUrl: { pathname: "/about" } },
      })
    ).toBe(true);
  });
});
