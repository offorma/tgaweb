export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminHandler, parseJsonBody } from "@/lib/admin-api";
import { invalidateCache, getSiteSettings } from "@/lib/content";
import { db } from "@/lib/db";
import { SiteSettingsSchema } from "@/lib/validations/site";

// GET — current settings (allowed for EDITOR — read-only)
export const GET = adminHandler(async () => {
  const settings = await getSiteSettings();
  return NextResponse.json({ settings });
}, { method: "GET", requiredRole: "EDITOR" });

// PUT — update singleton (requires ADMIN)
export const PUT = adminHandler(async (req) => {
  const body = await parseJsonBody(req);
  const parsed = SiteSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const updated = await db.siteSettings.update({
    where: { id: "singleton" },
    data: parsed.data,
  });
  invalidateCache("settings");
  return NextResponse.json({ settings: updated });
}, { method: "PUT", requiredRole: "ADMIN" });
