/**
 * Secrets data-access layer.
 * Reads from DB with a 30-second cache. Plaintext values are decrypted on demand
 * only by getSecretValue() — never on list operations.
 */

import { db } from "@/lib/db";
import { decryptSecret, encryptSecret, isMasterKeyConfigured } from "@/lib/secrets";
import type { Secret } from "@prisma/client";

type CacheEntry = { value: any; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && hit.expiresAt > now) return Promise.resolve(hit.value as T);
  return fn().then((v) => {
    cache.set(key, { value: v, expiresAt: now + CACHE_TTL_MS });
    return v;
  });
}

export function invalidateSecretsCache() {
  cache.delete("secrets:list");
}

export async function getAllSecrets(): Promise<Secret[]> {
  return cached("secrets:list", () =>
    db.secret.findMany({ orderBy: [{ category: "asc" }, { key: "asc" }] })
  );
}

export async function getSecretsByCategory(category: string): Promise<Secret[]> {
  const all = await getAllSecrets();
  return all.filter((s) => s.category === category);
}

/**
 * Decrypt and return the plaintext value of a single secret by key.
 * Use this in server code (e.g. email sending) to fetch credentials.
 * Returns null if the secret doesn't exist or the vault is not configured.
 */
export async function getSecretValue(key: string): Promise<string | null> {
  try {
    const secret = await db.secret.findUnique({ where: { key } });
    if (!secret) return null;
    return decryptSecret(secret.ciphertext);
  } catch (e) {
    console.error(`[secrets] Failed to decrypt ${key}:`, e);
    return null;
  }
}

/**
 * Get multiple secret values at once. Returns a key→value map.
 */
export async function getSecretValues(keys: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const key of keys) {
    const v = await getSecretValue(key);
    if (v !== null) result[key] = v;
  }
  return result;
}

export async function createSecret(opts: {
  key: string;
  category: string;
  description?: string;
  value: string;
}): Promise<Secret> {
  if (!isMasterKeyConfigured()) {
    throw new Error("Cannot create secret: SECRETS_MASTER_KEY is not set in the environment.");
  }
  const { ciphertext, previewHint } = encryptSecret(opts.value);
  const created = await db.secret.create({
    data: {
      key: opts.key,
      category: opts.category,
      description: opts.description || null,
      ciphertext,
      previewHint,
      lastRotatedAt: new Date(),
    },
  });
  invalidateSecretsCache();
  return created;
}

export async function updateSecret(
  id: string,
  opts: {
    key?: string;
    category?: string;
    description?: string | null;
    value?: string; // if provided, re-encrypt
  }
): Promise<Secret> {
  const data: any = {};
  if (opts.key !== undefined) data.key = opts.key;
  if (opts.category !== undefined) data.category = opts.category;
  if (opts.description !== undefined) data.description = opts.description || null;
  if (opts.value !== undefined) {
    const { ciphertext, previewHint } = encryptSecret(opts.value);
    data.ciphertext = ciphertext;
    data.previewHint = previewHint;
    data.lastRotatedAt = new Date();
  }
  const updated = await db.secret.update({ where: { id }, data });
  invalidateSecretsCache();
  return updated;
}

export async function deleteSecret(id: string): Promise<void> {
  await db.secret.delete({ where: { id } });
  invalidateSecretsCache();
}

export async function getSecretStats(): Promise<{
  total: number;
  byCategory: Record<string, number>;
  lastRotatedAt: Date | null;
  masterKeyConfigured: boolean;
}> {
  const all = await getAllSecrets();
  const byCategory: Record<string, number> = {};
  let lastRotatedAt: Date | null = null;
  for (const s of all) {
    byCategory[s.category] = (byCategory[s.category] || 0) + 1;
    if (s.lastRotatedAt && (!lastRotatedAt || s.lastRotatedAt > lastRotatedAt)) {
      lastRotatedAt = s.lastRotatedAt;
    }
  }
  return {
    total: all.length,
    byCategory,
    lastRotatedAt,
    masterKeyConfigured: isMasterKeyConfigured(),
  };
}
