import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Backend unit tests for src/lib/secrets-data.ts.
 *
 * Boundaries mocked:
 *  - @/lib/db: fake Prisma `secret` delegate.
 *  - @/lib/secrets: encrypt/decrypt/isMasterKeyConfigured stubbed so we can
 *    assert wiring and force error branches without touching real crypto.
 *
 * The module keeps a 30s in-memory cache keyed by "secrets:list"; we reset
 * modules per test (fresh cache) and use fake timers to test cache TTL.
 */

const h = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  decryptSecret: vi.fn(),
  encryptSecret: vi.fn(),
  isMasterKeyConfigured: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    secret: {
      findMany: h.findMany,
      findUnique: h.findUnique,
      create: h.create,
      update: h.update,
      delete: h.del,
    },
  },
}));

vi.mock("@/lib/secrets", () => ({
  decryptSecret: h.decryptSecret,
  encryptSecret: h.encryptSecret,
  isMasterKeyConfigured: h.isMasterKeyConfigured,
}));

async function fresh() {
  vi.resetModules();
  return import("@/lib/secrets-data");
}

beforeEach(() => {
  vi.clearAllMocks();
  h.isMasterKeyConfigured.mockReturnValue(true);
  h.encryptSecret.mockReturnValue({ ciphertext: "CIPHER", previewHint: "HINT" });
  h.decryptSecret.mockImplementation((c: string) => `plain:${c}`);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getAllSecrets() + caching", () => {
  it("queries the DB ordered by category then key", async () => {
    const rows = [{ id: "1", category: "a", key: "k" }];
    h.findMany.mockResolvedValue(rows);
    const { getAllSecrets } = await fresh();
    expect(await getAllSecrets()).toBe(rows);
    expect(h.findMany).toHaveBeenCalledWith({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });
  });

  it("caches the list for 30s (second call hits cache)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-21T00:00:00Z"));
    h.findMany.mockResolvedValue([{ id: "1" }]);
    const { getAllSecrets } = await fresh();
    await getAllSecrets();
    await getAllSecrets();
    expect(h.findMany).toHaveBeenCalledTimes(1);
  });

  it("re-queries after the cache TTL expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-21T00:00:00Z"));
    h.findMany.mockResolvedValue([{ id: "1" }]);
    const { getAllSecrets } = await fresh();
    await getAllSecrets();
    vi.advanceTimersByTime(30_001);
    await getAllSecrets();
    expect(h.findMany).toHaveBeenCalledTimes(2);
  });
});

describe("invalidateSecretsCache()", () => {
  it("forces a fresh DB read on the next getAllSecrets()", async () => {
    h.findMany.mockResolvedValue([{ id: "1" }]);
    const { getAllSecrets, invalidateSecretsCache } = await fresh();
    await getAllSecrets();
    invalidateSecretsCache();
    await getAllSecrets();
    expect(h.findMany).toHaveBeenCalledTimes(2);
  });
});

describe("getSecretsByCategory()", () => {
  it("filters the cached list by category", async () => {
    h.findMany.mockResolvedValue([
      { id: "1", category: "smtp", key: "a" },
      { id: "2", category: "auth", key: "b" },
      { id: "3", category: "smtp", key: "c" },
    ]);
    const { getSecretsByCategory } = await fresh();
    const res = await getSecretsByCategory("smtp");
    expect(res.map((s) => s.id)).toEqual(["1", "3"]);
  });
});

describe("getSecretValue()", () => {
  it("decrypts the matching secret", async () => {
    h.findUnique.mockResolvedValue({ key: "K", ciphertext: "CT" });
    const { getSecretValue } = await fresh();
    expect(await getSecretValue("K")).toBe("plain:CT");
    expect(h.findUnique).toHaveBeenCalledWith({ where: { key: "K" } });
  });

  it("returns null when the secret does not exist", async () => {
    h.findUnique.mockResolvedValue(null);
    const { getSecretValue } = await fresh();
    expect(await getSecretValue("nope")).toBeNull();
  });

  it("returns null and logs when decryption throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.findUnique.mockResolvedValue({ key: "K", ciphertext: "CT" });
    h.decryptSecret.mockImplementation(() => {
      throw new Error("bad key");
    });
    const { getSecretValue } = await fresh();
    expect(await getSecretValue("K")).toBeNull();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("getSecretValues()", () => {
  it("returns a map of only the keys that resolve to a value", async () => {
    h.findUnique.mockImplementation(({ where: { key } }: any) =>
      key === "MISS" ? null : { key, ciphertext: `ct-${key}` }
    );
    const { getSecretValues } = await fresh();
    const res = await getSecretValues(["A", "MISS", "B"]);
    expect(res).toEqual({ A: "plain:ct-A", B: "plain:ct-B" });
    expect(res).not.toHaveProperty("MISS");
  });
});

describe("createSecret()", () => {
  it("encrypts the value and creates the row, then invalidates cache", async () => {
    const row = { id: "x" };
    h.create.mockResolvedValue(row);
    h.findMany.mockResolvedValue([]);
    const { createSecret, getAllSecrets } = await fresh();

    // warm the cache first
    await getAllSecrets();
    expect(h.findMany).toHaveBeenCalledTimes(1);

    const out = await createSecret({
      key: "API_KEY",
      category: "api",
      description: "desc",
      value: "v",
    });
    expect(out).toBe(row);
    expect(h.encryptSecret).toHaveBeenCalledWith("v");
    expect(h.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        key: "API_KEY",
        category: "api",
        description: "desc",
        ciphertext: "CIPHER",
        previewHint: "HINT",
        lastRotatedAt: expect.any(Date),
      }),
    });

    // cache invalidated → next getAllSecrets re-queries
    await getAllSecrets();
    expect(h.findMany).toHaveBeenCalledTimes(2);
  });

  it("stores null description when omitted", async () => {
    h.create.mockResolvedValue({ id: "x" });
    const { createSecret } = await fresh();
    await createSecret({ key: "K", category: "c", value: "v" });
    expect(h.create.mock.calls[0][0].data.description).toBeNull();
  });

  it("throws when master key not configured", async () => {
    h.isMasterKeyConfigured.mockReturnValue(false);
    const { createSecret } = await fresh();
    await expect(
      createSecret({ key: "K", category: "c", value: "v" })
    ).rejects.toThrow(/SECRETS_MASTER_KEY is not set/);
    expect(h.create).not.toHaveBeenCalled();
  });
});

describe("updateSecret()", () => {
  it("updates only the provided scalar fields", async () => {
    h.update.mockResolvedValue({ id: "1" });
    const { updateSecret } = await fresh();
    await updateSecret("1", { key: "NEW", category: "newcat" });
    expect(h.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { key: "NEW", category: "newcat" },
    });
    expect(h.encryptSecret).not.toHaveBeenCalled();
  });

  it("coerces an empty/null description to null", async () => {
    h.update.mockResolvedValue({ id: "1" });
    const { updateSecret } = await fresh();
    await updateSecret("1", { description: null });
    expect(h.update.mock.calls[0][0].data.description).toBeNull();
  });

  it("keeps a non-empty description", async () => {
    h.update.mockResolvedValue({ id: "1" });
    const { updateSecret } = await fresh();
    await updateSecret("1", { description: "kept" });
    expect(h.update.mock.calls[0][0].data.description).toBe("kept");
  });

  it("re-encrypts when a new value is provided", async () => {
    h.update.mockResolvedValue({ id: "1" });
    const { updateSecret } = await fresh();
    await updateSecret("1", { value: "newval" });
    expect(h.encryptSecret).toHaveBeenCalledWith("newval");
    const data = h.update.mock.calls[0][0].data;
    expect(data.ciphertext).toBe("CIPHER");
    expect(data.previewHint).toBe("HINT");
    expect(data.lastRotatedAt).toBeInstanceOf(Date);
  });

  it("invalidates the cache", async () => {
    h.findMany.mockResolvedValue([]);
    h.update.mockResolvedValue({ id: "1" });
    const { updateSecret, getAllSecrets } = await fresh();
    await getAllSecrets();
    await updateSecret("1", { key: "K" });
    await getAllSecrets();
    expect(h.findMany).toHaveBeenCalledTimes(2);
  });
});

describe("deleteSecret()", () => {
  it("deletes the row and invalidates the cache", async () => {
    h.del.mockResolvedValue({});
    h.findMany.mockResolvedValue([]);
    const { deleteSecret, getAllSecrets } = await fresh();
    await getAllSecrets();
    await deleteSecret("1");
    expect(h.del).toHaveBeenCalledWith({ where: { id: "1" } });
    await getAllSecrets();
    expect(h.findMany).toHaveBeenCalledTimes(2);
  });
});

describe("getSecretStats()", () => {
  it("aggregates totals, by-category counts and latest rotation date", async () => {
    const d1 = new Date("2026-01-01");
    const d2 = new Date("2026-05-01");
    h.findMany.mockResolvedValue([
      { id: "1", category: "smtp", lastRotatedAt: d1 },
      { id: "2", category: "smtp", lastRotatedAt: d2 },
      { id: "3", category: "auth", lastRotatedAt: null },
    ]);
    h.isMasterKeyConfigured.mockReturnValue(true);
    const { getSecretStats } = await fresh();
    const stats = await getSecretStats();
    expect(stats.total).toBe(3);
    expect(stats.byCategory).toEqual({ smtp: 2, auth: 1 });
    expect(stats.lastRotatedAt).toEqual(d2);
    expect(stats.masterKeyConfigured).toBe(true);
  });

  it("handles an empty vault and unconfigured key", async () => {
    h.findMany.mockResolvedValue([]);
    h.isMasterKeyConfigured.mockReturnValue(false);
    const { getSecretStats } = await fresh();
    const stats = await getSecretStats();
    expect(stats).toEqual({
      total: 0,
      byCategory: {},
      lastRotatedAt: null,
      masterKeyConfigured: false,
    });
  });
});
