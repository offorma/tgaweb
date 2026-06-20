export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminHandler } from "@/lib/admin-api";
import { db } from "@/lib/db";

// GET — recent audit logs (last 100)
export const GET = adminHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
  const logs = await db.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { email: true, name: true },
      },
    },
  });
  return NextResponse.json({ logs });
}, { method: "GET", limit: 30, requiredRole: "ADMIN" });
