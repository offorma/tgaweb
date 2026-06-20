export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminHandler, parseJsonBody } from "@/lib/admin-api";
import { getAllSecrets, getSecretStats, createSecret } from "@/lib/secrets-data";
import { SecretSchema } from "@/lib/validations/site";
import { isMasterKeyConfigured } from "@/lib/secrets";
import { db } from "@/lib/db";

/**
 * GET /api/admin/secrets
 * Returns the list of secrets with masked values (previewHint only).
 * Plaintext is NEVER returned by this endpoint — use /reveal for that.
 *
 * Requires ADMIN role (secrets are sensitive — EDITORs cannot list them).
 */
export const GET = adminHandler(async () => {
  const [secrets, stats] = await Promise.all([getAllSecrets(), getSecretStats()]);
  // Strip ciphertext from response — never expose it to the client
  const safe = secrets.map((s) => ({
    id: s.id,
    key: s.key,
    category: s.category,
    description: s.description,
    previewHint: s.previewHint,
    lastRotatedAt: s.lastRotatedAt,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
  return NextResponse.json({ secrets: safe, stats });
}, { method: "GET", requiredRole: "ADMIN" });

/**
 * POST /api/admin/secrets
 * Create a new secret. Plaintext value is encrypted before storage.
 * Requires ADMIN role.
 */
export const POST = adminHandler(async (req, user) => {
  if (!isMasterKeyConfigured()) {
    return NextResponse.json(
      {
        error:
          "SECRETS_MASTER_KEY is not set in the environment. Configure it in cPanel → Setup Node.js App → Environment Variables before adding secrets.",
      },
      { status: 503 }
    );
  }
  const body = await parseJsonBody(req);
  const parsed = SecretSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  // Check for duplicate key
  const existing = await db.secret.findUnique({ where: { key: parsed.data.key } });
  if (existing) {
    return NextResponse.json(
      { error: `A secret with key "${parsed.data.key}" already exists.` },
      { status: 409 }
    );
  }
  const created = await createSecret({
    key: parsed.data.key,
    category: parsed.data.category,
    description: parsed.data.description,
    value: parsed.data.value,
  });
  // Return safe representation
  return NextResponse.json(
    {
      secret: {
        id: created.id,
        key: created.key,
        category: created.category,
        description: created.description,
        previewHint: created.previewHint,
        lastRotatedAt: created.lastRotatedAt,
      },
    },
    { status: 201 }
  );
}, { method: "POST", requiredRole: "ADMIN" });
