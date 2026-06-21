import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for the lazy-init Prisma Proxy in src/lib/db.ts.
 * We mock @prisma/client's PrismaClient constructor and assert:
 *  - the client is only instantiated on first property access (lazy)
 *  - it is instantiated exactly once (memoized on globalThis)
 *  - the log config differs between production and development
 */
const h = vi.hoisted(() => {
  const instance = { user: { findMany: vi.fn() }, $connect: vi.fn() };
  const PrismaClient = vi.fn(function () {
    return instance;
  });
  return { instance, PrismaClient };
});

vi.mock("@prisma/client", () => ({ PrismaClient: h.PrismaClient }));

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

beforeEach(() => {
  h.PrismaClient.mockClear();
  vi.resetModules();
  // Clear the memoized global between tests
  delete (globalThis as any).prisma;
});

afterEach(() => {
  (process.env as any).NODE_ENV = ORIGINAL_NODE_ENV;
  delete (globalThis as any).prisma;
});

describe("db proxy lazy initialization", () => {
  it("does not instantiate PrismaClient at import time", async () => {
    await import("./db");
    expect(h.PrismaClient).not.toHaveBeenCalled();
  });

  it("instantiates on first property access and proxies the property", async () => {
    const { db } = await import("./db");
    const delegate = db.user;
    expect(h.PrismaClient).toHaveBeenCalledTimes(1);
    expect(delegate).toBe(h.instance.user);
  });

  it("instantiates only once across multiple accesses", async () => {
    const { db } = await import("./db");
    void db.user;
    void db.user;
    void (db as any).$connect;
    expect(h.PrismaClient).toHaveBeenCalledTimes(1);
  });

  it("uses ['query','error','warn'] log config in development", async () => {
    (process.env as any).NODE_ENV = "development";
    const { db } = await import("./db");
    void db.user; // trigger init
    expect(h.PrismaClient).toHaveBeenCalledWith({
      log: ["query", "error", "warn"],
    });
  });

  it("uses ['error','warn'] log config in production", async () => {
    (process.env as any).NODE_ENV = "production";
    const { db } = await import("./db");
    void db.user; // trigger init
    expect(h.PrismaClient).toHaveBeenCalledWith({
      log: ["error", "warn"],
    });
  });
});
