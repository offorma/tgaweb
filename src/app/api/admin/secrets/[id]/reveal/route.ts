import { NextResponse } from "next/server";
import { adminHandler, isValidId } from "@/lib/admin-api";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/secrets";
import { writeAuditLog } from "@/lib/auth-utils";

/**
 * POST /api/admin/secrets/[id]/reveal
 * Returns the DECRYPTED plaintext value of a secret.
 *
 * Requires ADMIN role (EDITORS cannot reveal secrets).
 * Rate-limited to 10 reveals per minute per IP.
 * Every reveal is audit-logged.
 */
export const POST = adminHandler(async (req, user, ctx) => {
  const id = ctx.params?.id;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const s = await db.secret.findUnique({ where: { id } });
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let plaintext: string;
  try {
    plaintext = decryptSecret(s.ciphertext);
  } catch (e: any) {
    // Don't leak the underlying crypto error
    console.error("[reveal] decrypt failed:", e);
    return NextResponse.json(
      { error: "Failed to decrypt — master key may have been rotated." },
      { status: 500 }
    );
  }

  await writeAuditLog({
    userId: user.id,
    action: "secret.reveal",
    entity: "Secret",
    entityId: id,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    userAgent: req.headers.get("user-agent") || undefined,
    meta: JSON.stringify({ key: s.key }),
  });

  return NextResponse.json({ value: plaintext });
}, { method: "POST", limit: 10, requiredRole: "ADMIN" });
