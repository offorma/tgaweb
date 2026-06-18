import { NextResponse } from "next/server";
import { adminHandler, parseJsonBody } from "@/lib/admin-api";
import { z } from "zod";
import { db } from "@/lib/db";
import { invalidateCache } from "@/lib/content";

const Schema = z.strictObject({
  ids: z.array(z.string().min(1).max(50)).min(1).max(50),
});

/**
 * POST /api/admin/slides/reorder
 * Reorders slides based on the array of IDs (new order).
 * Each slide's `order` field is updated to match its index in the array.
 *
 * Requires ADMIN role.
 */
export const POST = adminHandler(async (req, user) => {
  const body = await parseJsonBody(req);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Update each slide's order in a transaction
  const updates = parsed.data.ids.map((id, index) =>
    db.slide.update({ where: { id }, data: { order: index } })
  );

  await db.$transaction(updates);
  invalidateCache("slides");

  return NextResponse.json({ ok: true });
}, { method: "POST", requiredRole: "ADMIN" });
