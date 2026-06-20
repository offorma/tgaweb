export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminHandler, parseJsonBody } from "@/lib/admin-api";
import { db } from "@/lib/db";
import { SecurityPolicySchema } from "@/lib/validations/site";
import { writeAuditLog } from "@/lib/auth-utils";
import { getClientIp } from "@/lib/rate-limit";

// Default policy values used if the singleton doesn't exist yet
const DEFAULT_POLICY = {
  enforceTwoFactorForAdmins: true,
  enforceTwoFactorForEditors: false,
  minPasswordLength: 12,
  sessionTimeoutHours: 8,
};

/**
 * GET /api/admin/security-policy
 * Returns the global security policy singleton. Requires ADMIN role.
 */
export const GET = adminHandler(async () => {
  let policy = await db.securityPolicy.findUnique({ where: { id: "singleton" } });
  if (!policy) {
    policy = await db.securityPolicy.create({
      data: { id: "singleton", ...DEFAULT_POLICY },
    });
  }
  return NextResponse.json({ policy });
}, { method: "GET", requiredRole: "ADMIN" });

/**
 * PUT /api/admin/security-policy
 * Updates the global security policy. Requires ADMIN role. Audit-logged.
 *
 * When enforceTwoFactorForAdmins is toggled ON, all admin users without 2FA
 * get mustEnable2FA=true so they're forced to set it up on next login.
 */
export const PUT = adminHandler(async (req, user) => {
  const body = await parseJsonBody(req);
  const parsed = SecurityPolicySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await db.securityPolicy.upsert({
    where: { id: "singleton" },
    update: parsed.data,
    create: { id: "singleton", ...parsed.data },
  });

  // If 2FA enforcement was just turned ON for admins, flag all admins without 2FA
  if (parsed.data.enforceTwoFactorForAdmins) {
    await db.user.updateMany({
      where: {
        role: "ADMIN",
        twoFactorEnabled: false,
        isActive: true,
      },
      data: { mustEnable2FA: true },
    });
  }
  // Same for editors
  if (parsed.data.enforceTwoFactorForEditors) {
    await db.user.updateMany({
      where: {
        role: "EDITOR",
        twoFactorEnabled: false,
        isActive: true,
      },
      data: { mustEnable2FA: true },
    });
  }

  await writeAuditLog({
    userId: user.id,
    action: "security-policy.update",
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent") || undefined,
    meta: JSON.stringify(parsed.data),
  });

  return NextResponse.json({ policy: updated });
}, { method: "PUT", requiredRole: "ADMIN" });
