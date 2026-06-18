import { NextResponse } from "next/server";
import { adminHandler, parseJsonBody, isValidId } from "@/lib/admin-api";
import { updateSecret, deleteSecret } from "@/lib/secrets-data";
import { SecretUpdateSchema } from "@/lib/validations/site";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/auth-utils";

/**
 * GET /api/admin/secrets/[id] — return safe metadata for a single secret
 * Requires ADMIN role (secrets are sensitive).
 */
export const GET = adminHandler(async (req, user, ctx) => {
  const id = ctx.params?.id;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const s = await db.secret.findUnique({ where: { id } });
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    secret: {
      id: s.id,
      key: s.key,
      category: s.category,
      description: s.description,
      previewHint: s.previewHint,
      lastRotatedAt: s.lastRotatedAt,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    },
  });
}, { method: "GET", requiredRole: "ADMIN" });

/**
 * PUT /api/admin/secrets/[id] — update metadata and/or value
 * Requires ADMIN role.
 */
export const PUT = adminHandler(async (req, user, ctx) => {
  const id = ctx.params?.id;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = await parseJsonBody(req);
  const parsed = SecretUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // If updating the key, check for duplicate
  if (parsed.data.key) {
    const existing = await db.secret.findFirst({
      where: { key: parsed.data.key, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Another secret with key "${parsed.data.key}" already exists.` },
        { status: 409 }
      );
    }
  }

  const updated = await updateSecret(id, {
    key: parsed.data.key,
    category: parsed.data.category,
    description: parsed.data.description,
    value: parsed.data.value,
  });

  await writeAuditLog({
    userId: user.id,
    action: "secret.update",
    entity: "Secret",
    entityId: id,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: req.headers.get("user-agent") || undefined,
    meta: JSON.stringify({ key: updated.key, valueChanged: parsed.data.value !== undefined }),
  });

  return NextResponse.json({
    secret: {
      id: updated.id,
      key: updated.key,
      category: updated.category,
      description: updated.description,
      previewHint: updated.previewHint,
      lastRotatedAt: updated.lastRotatedAt,
    },
  });
}, { method: "PUT", requiredRole: "ADMIN" });

/**
 * DELETE /api/admin/secrets/[id]
 * Requires ADMIN role.
 */
export const DELETE = adminHandler(async (req, user, ctx) => {
  const id = ctx.params?.id;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const s = await db.secret.findUnique({ where: { id } });
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await deleteSecret(id);
  await writeAuditLog({
    userId: user.id,
    action: "secret.delete",
    entity: "Secret",
    entityId: id,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: req.headers.get("user-agent") || undefined,
    meta: JSON.stringify({ key: s.key }),
  });
  return NextResponse.json({ ok: true });
}, { method: "DELETE", requiredRole: "ADMIN" });
