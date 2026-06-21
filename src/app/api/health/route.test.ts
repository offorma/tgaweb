import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  userCount: vi.fn(),
  userFindUnique: vi.fn(),
  settingsFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { count: h.userCount, findUnique: h.userFindUnique },
    siteSettings: { findUnique: h.settingsFindUnique },
  },
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = "test";
  process.env.NEXTAUTH_SECRET = "a-secret-value";
  process.env.NEXTAUTH_URL = "http://localhost:3000";
  process.env.SECRETS_MASTER_KEY = "master";
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
});

describe("GET /api/health", () => {
  it("reports OK when DB connects and admin user is healthy", async () => {
    h.userCount.mockResolvedValue(3);
    h.userFindUnique.mockResolvedValue({
      id: "u1",
      email: "admin@trailgliders.edu.ng",
      role: "ADMIN",
      isActive: true,
      failedAttempts: 0,
      lockedUntil: null,
      twoFactorEnabled: true,
      mustEnable2FA: false,
      mustChangePassword: false,
      lastLoginAt: new Date("2026-01-01T00:00:00Z"),
    });
    h.settingsFindUnique.mockResolvedValue({ id: "singleton" });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.dbConnection).toBe("OK");
    expect(json.userCount).toBe(3);
    expect(json.adminUser.exists).toBe(true);
    expect(json.siteSettings).toBe("OK");
    expect(json.nextAuthSecret).toContain("set");
    expect(json.databaseUrl).toContain("***");
    expect(json.adminWarning).toBeUndefined();
  });

  it("warns when there are no users", async () => {
    h.userCount.mockResolvedValue(0);
    h.settingsFindUnique.mockResolvedValue(null);
    const res = await GET();
    const json = await res.json();
    expect(json.dbWarning).toContain("No users");
    expect(json.siteSettings).toContain("NOT FOUND");
    expect(h.userFindUnique).not.toHaveBeenCalled();
  });

  it("warns when the admin user is missing", async () => {
    h.userCount.mockResolvedValue(2);
    h.userFindUnique.mockResolvedValue(null);
    h.settingsFindUnique.mockResolvedValue({ id: "singleton" });
    const res = await GET();
    const json = await res.json();
    expect(json.adminUser).toEqual({ exists: false });
    expect(json.adminWarning).toContain("not found");
  });

  it("warns when the admin account is inactive", async () => {
    h.userCount.mockResolvedValue(2);
    h.userFindUnique.mockResolvedValue({
      role: "ADMIN",
      isActive: false,
      failedAttempts: 0,
      lockedUntil: null,
      twoFactorEnabled: false,
      lastLoginAt: null,
    });
    h.settingsFindUnique.mockResolvedValue({ id: "singleton" });
    const res = await GET();
    const json = await res.json();
    expect(json.adminWarning).toContain("INACTIVE");
  });

  it("warns when the admin account is locked", async () => {
    h.userCount.mockResolvedValue(2);
    h.userFindUnique.mockResolvedValue({
      role: "ADMIN",
      isActive: true,
      failedAttempts: 2,
      lockedUntil: new Date(Date.now() + 60_000),
      twoFactorEnabled: false,
      lastLoginAt: null,
    });
    h.settingsFindUnique.mockResolvedValue({ id: "singleton" });
    const res = await GET();
    const json = await res.json();
    expect(json.adminWarning).toContain("LOCKED");
  });

  it("warns when the admin account has many failed attempts", async () => {
    h.userCount.mockResolvedValue(2);
    h.userFindUnique.mockResolvedValue({
      role: "ADMIN",
      isActive: true,
      failedAttempts: 6,
      lockedUntil: null,
      twoFactorEnabled: false,
      lastLoginAt: null,
    });
    h.settingsFindUnique.mockResolvedValue({ id: "singleton" });
    const res = await GET();
    const json = await res.json();
    expect(json.adminWarning).toContain("failed attempts");
  });

  it("reports FAILED when the DB throws an Error", async () => {
    h.userCount.mockRejectedValue(new Error("db down"));
    const res = await GET();
    const json = await res.json();
    expect(json.dbConnection).toBe("FAILED");
    expect(json.dbError).toBe("db down");
  });

  it("reports FAILED when the DB throws a non-Error", async () => {
    h.userCount.mockRejectedValue("kaput");
    const res = await GET();
    const json = await res.json();
    expect(json.dbConnection).toBe("FAILED");
    expect(json.dbError).toBe("kaput");
  });

  it("reports missing env vars when unset", async () => {
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_URL;
    delete process.env.SECRETS_MASTER_KEY;
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
    h.userCount.mockResolvedValue(1);
    h.userFindUnique.mockResolvedValue(null);
    h.settingsFindUnique.mockResolvedValue(null);
    const res = await GET();
    const json = await res.json();
    expect(json.nodeEnv).toBe("(not set)");
    expect(json.nextAuthSecret).toContain("NOT SET");
    expect(json.nextAuthUrl).toContain("NOT SET");
    expect(json.secretsMasterKey).toBe("NOT SET");
    expect(json.databaseUrl).toBe("NOT SET");
  });
});
