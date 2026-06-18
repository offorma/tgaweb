import { NextResponse } from "next/server";
import { adminHandler } from "@/lib/admin-api";
import { db } from "@/lib/db";

// GET — current admin user profile (allowed for any authenticated user)
export const GET = adminHandler(async (req, user) => {
  const u = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      lastLoginAt: true,
      createdAt: true,
      twoFactorEnabled: true,
      twoFactorEnabledAt: true,
      isActive: true,
      mustEnable2FA: true,
      mustChangePassword: true,
    },
  });
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user: u });
}, { method: "GET", requiredRole: "EDITOR" });
