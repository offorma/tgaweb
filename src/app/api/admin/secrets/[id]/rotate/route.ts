export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminHandler, isValidId } from "@/lib/admin-api";
import { db } from "@/lib/db";
import { encryptSecret, generateRandomSecret } from "@/lib/secrets";
import { invalidateSecretsCache } from "@/lib/secrets-data";
import { writeAuditLog } from "@/lib/auth-utils";

/**
 * POST /api/admin/secrets/[id]/rotate
 * Generates a new strong random value, encrypts it, and replaces the existing one.
 *
 * Requires ADMIN role.
 * Rate-limited to 5 rotations per minute per IP.
 * The new plaintext is returned ONCE so the admin can copy it.
 */
export const POST = adminHandler(async (req, user, ctx) => {
  const id = ctx.params?.id;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const s = await db.secret.findUnique({ where: { id } });
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Generate a new strong value (40 chars by default)
  const newValue = generateRandomSecret(40);
  const { ciphertext, previewHint } = encryptSecret(newValue);

  await db.secret.update({
    where: { id },
    data: {
      ciphertext,
      previewHint,
      lastRotatedAt: new Date(),
    },
  });
  invalidateSecretsCache();

  await writeAuditLog({
    userId: user.id,
    action: "secret.rotate",
    entity: "Secret",
    entityId: id,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: req.headers.get("user-agent") || undefined,
    meta: JSON.stringify({ key: s.key }),
  });

  return NextResponse.json({
    value: newValue, // returned ONCE for the admin to copy
    previewHint,
    message: "Secret rotated. The new value is shown once — copy it now.",
  });
}, { method: "POST", limit: 5, requiredRole: "ADMIN" });
