import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for src/lib/cloudinary.ts. The `cloudinary` package is mocked so no
 * real config/network happens; we assert getCloudinary() resolves credentials
 * from the secrets vault first, then env vars, and throws when unconfigured.
 */
const h = vi.hoisted(() => ({
  configMock: vi.fn(),
  getSecretValueMock: vi.fn(),
}));

vi.mock("cloudinary", () => {
  const v2 = { config: h.configMock };
  return { v2, default: { v2 } };
});
vi.mock("@/lib/secrets-data", () => ({
  getSecretValue: h.getSecretValueMock,
}));

import { getCloudinary } from "./cloudinary";

const ENV_KEYS = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

beforeEach(() => {
  vi.clearAllMocks();
  h.getSecretValueMock.mockResolvedValue(null);
  for (const k of ENV_KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
});

describe("getCloudinary", () => {
  it("uses vault values when present and configures cloudinary", async () => {
    h.getSecretValueMock.mockImplementation(async (key: string) =>
      ({
        CLOUDINARY_CLOUD_NAME: "vault-cloud",
        CLOUDINARY_API_KEY: "vault-key",
        CLOUDINARY_API_SECRET: "vault-secret",
      } as Record<string, string>)[key]
    );

    const c = await getCloudinary();
    expect(c).toBeDefined();
    expect(h.configMock).toHaveBeenCalledWith({
      cloud_name: "vault-cloud",
      api_key: "vault-key",
      api_secret: "vault-secret",
    });
  });

  it("falls back to env vars when the vault returns null", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "env-cloud";
    process.env.CLOUDINARY_API_KEY = "env-key";
    process.env.CLOUDINARY_API_SECRET = "env-secret";

    await getCloudinary();
    expect(h.configMock).toHaveBeenCalledWith({
      cloud_name: "env-cloud",
      api_key: "env-key",
      api_secret: "env-secret",
    });
  });

  it("throws when no credentials are configured anywhere", async () => {
    await expect(getCloudinary()).rejects.toThrow(/Cloudinary is not configured/);
    expect(h.configMock).not.toHaveBeenCalled();
  });

  it("throws when only some credentials are present", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "env-cloud";
    // missing api key + secret
    await expect(getCloudinary()).rejects.toThrow(/Cloudinary is not configured/);
  });
});
