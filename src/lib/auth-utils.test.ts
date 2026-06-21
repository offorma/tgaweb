import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Backend unit tests for src/lib/auth-utils.ts.
 *
 * Boundaries mocked:
 * - bcryptjs: hash/compare stubbed so we don't run real (slow) hashing and can
 *   force the compare-throws branch.
 * - @/lib/db: fake Prisma `user` + `auditLog` delegates.
 */

const h = vi.hoisted(() => ({
  hash: vi.fn(),
  compare: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: h.hash, compare: h.compare },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: h.findUnique, update: h.update },
    auditLog: { create: h.auditCreate },
  },
}));

import {
  hashPassword,
  verifyPassword,
  getLockoutRemaining,
  recordFailedLogin,
  recordSuccessfulLogin,
  writeAuditLog,
} from "@/lib/auth-utils";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-21T00:00:00Z"));
  h.hash.mockResolvedValue("hashed");
  h.update.mockResolvedValue({});
  h.auditCreate.mockResolvedValue({});
});

describe("hashPassword()", () => {
  it("delegates to bcrypt.hash with 12 salt rounds", async () => {
    const out = await hashPassword("pw");
    expect(out).toBe("hashed");
    expect(h.hash).toHaveBeenCalledWith("pw", 12);
  });
});

describe("verifyPassword()", () => {
  it("returns true when bcrypt.compare resolves true", async () => {
    h.compare.mockResolvedValue(true);
    expect(await verifyPassword("pw", "hash")).toBe(true);
  });

  it("returns false when bcrypt.compare resolves false", async () => {
    h.compare.mockResolvedValue(false);
    expect(await verifyPassword("pw", "hash")).toBe(false);
  });

  it("returns false (swallows) when bcrypt.compare throws", async () => {
    h.compare.mockRejectedValue(new Error("bad hash"));
    expect(await verifyPassword("pw", "hash")).toBe(false);
  });
});

describe("getLockoutRemaining()", () => {
  it("returns 0 when user not found", async () => {
    h.findUnique.mockResolvedValue(null);
    expect(await getLockoutRemaining("u1")).toBe(0);
  });

  it("returns 0 when lockedUntil is null/absent", async () => {
    h.findUnique.mockResolvedValue({ id: "u1", lockedUntil: null });
    expect(await getLockoutRemaining("u1")).toBe(0);
  });

  it("returns remaining seconds when locked in the future", async () => {
    h.findUnique.mockResolvedValue({
      id: "u1",
      lockedUntil: new Date(Date.now() + 90_000),
    });
    expect(await getLockoutRemaining("u1")).toBe(90);
  });

  it("returns 0 when lockedUntil is in the past", async () => {
    h.findUnique.mockResolvedValue({
      id: "u1",
      lockedUntil: new Date(Date.now() - 1000),
    });
    expect(await getLockoutRemaining("u1")).toBe(0);
  });

  it("returns 0 at the exact boundary (remaining <= 0)", async () => {
    h.findUnique.mockResolvedValue({
      id: "u1",
      lockedUntil: new Date(Date.now()),
    });
    expect(await getLockoutRemaining("u1")).toBe(0);
  });
});

describe("recordFailedLogin()", () => {
  it("does nothing when user not found", async () => {
    h.findUnique.mockResolvedValue(null);
    await recordFailedLogin("u1");
    expect(h.update).not.toHaveBeenCalled();
  });

  it("increments attempts without locking below 5", async () => {
    h.findUnique.mockResolvedValue({
      id: "u1",
      failedAttempts: 2,
      lockedUntil: null,
    });
    await recordFailedLogin("u1");
    expect(h.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { failedAttempts: 3, lockedUntil: null },
    });
  });

  it("locks for 15 minutes on the 5th failure (boundary)", async () => {
    h.findUnique.mockResolvedValue({
      id: "u1",
      failedAttempts: 4,
      lockedUntil: null,
    });
    await recordFailedLogin("u1");
    const arg = h.update.mock.calls[0][0];
    expect(arg.data.failedAttempts).toBe(5);
    expect(arg.data.lockedUntil).toEqual(new Date(Date.now() + 15 * 60 * 1000));
  });

  it("locks when attempts already above threshold", async () => {
    h.findUnique.mockResolvedValue({
      id: "u1",
      failedAttempts: 7,
      lockedUntil: null,
    });
    await recordFailedLogin("u1");
    const arg = h.update.mock.calls[0][0];
    expect(arg.data.failedAttempts).toBe(8);
    expect(arg.data.lockedUntil).toBeInstanceOf(Date);
  });
});

describe("recordSuccessfulLogin()", () => {
  it("resets counters and sets lastLoginAt", async () => {
    await recordSuccessfulLogin("u1");
    expect(h.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(Date.now()),
      },
    });
  });
});

describe("writeAuditLog()", () => {
  it("writes a full audit record", async () => {
    await writeAuditLog({
      userId: "u1",
      action: "LOGIN",
      entity: "User",
      entityId: "u1",
      ip: "1.2.3.4",
      userAgent: "UA",
      meta: "{}",
    });
    expect(h.auditCreate).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        action: "LOGIN",
        entity: "User",
        entityId: "u1",
        ip: "1.2.3.4",
        userAgent: "UA",
        meta: "{}",
      },
    });
  });

  it("defaults userId to null when omitted", async () => {
    await writeAuditLog({ action: "X" });
    expect(h.auditCreate.mock.calls[0][0].data.userId).toBeNull();
  });

  it("never throws when db.create fails (logs and swallows)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.auditCreate.mockRejectedValue(new Error("db down"));
    await expect(writeAuditLog({ action: "X" })).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
