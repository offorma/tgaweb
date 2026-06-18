import { NextResponse } from "next/server";
import { adminHandler, parseJsonBody, isValidId } from "@/lib/admin-api";
import { db } from "@/lib/db";
import { hashPassword, writeAuditLog } from "@/lib/auth-utils";
import { UserUpdateSchema } from "@/lib/validations/site";
import { getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/admin/users/[id]
 * Returns safe metadata for a single user. Requires ADMIN role.
 */
export const GET = adminHandler(async (req, user, ctx) => {
  const id = ctx.params?.id;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const u = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      twoFactorEnabled: true,
      twoFactorEnabledAt: true,
      mustEnable2FA: true,
      mustChangePassword: true,
      lastLoginAt: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user: u });
}, { method: "GET", requiredRole: "ADMIN" });

/**
 * PUT /api/admin/users/[id]
 * Updates a user's metadata (name, role, active state, mustEnable2FA, mustChangePassword)
 * and optionally resets their password (admin-set temp password).
 *
 * Safety:
 *   - An admin cannot deactivate or demote themselves (prevents self-lockout)
 *   - An admin cannot change their own role (must ask another admin)
 *   - All changes are audit-logged
 *
 * Requires ADMIN role.
 */
export const PUT = adminHandler(async (req, user, ctx) => {
  const id = ctx.params?.id;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await parseJsonBody(req);
  const parsed = UserUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const target = await db.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Self-protection: an admin cannot deactivate or demote themselves
  if (id === user.id) {
    if (parsed.data.isActive === false) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account. Ask another admin to do it." },
        { status: 400 }
      );
    }
    if (parsed.data.role && parsed.data.role !== target.role) {
      return NextResponse.json(
        { error: "You cannot change your own role. Ask another admin to do it." },
        { status: 400 }
      );
    }
  }

  // Prevent demoting the last active ADMIN (would lock everyone out of admin)
  if (target.role === "ADMIN" && parsed.data.role === "EDITOR") {
    const adminCount = await db.user.count({
      where: { role: "ADMIN", isActive: true, NOT: { id } },
    });
    if (adminCount === 0) {
      return NextResponse.json(
        { error: "Cannot demote the last active admin. Promote another user to ADMIN first." },
        { status: 400 }
      );
    }
  }
  // Same for deactivating the last active ADMIN
  if (target.role === "ADMIN" && target.isActive && parsed.data.isActive === false) {
    const adminCount = await db.user.count({
      where: { role: "ADMIN", isActive: true, NOT: { id } },
    });
    if (adminCount === 0) {
      return NextResponse.json(
        { error: "Cannot deactivate the last active admin. Promote another user to ADMIN first." },
        { status: 400 }
      );
    }
  }

  // Build the update payload (explicit allowlist — no spread)
  const data: any = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.role !== undefined) data.role = parsed.data.role;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
  if (parsed.data.mustEnable2FA !== undefined) data.mustEnable2FA = parsed.data.mustEnable2FA;
  if (parsed.data.mustChangePassword !== undefined) data.mustChangePassword = parsed.data.mustChangePassword;

  // If a new password was provided, hash it and force a change on next login
  if (parsed.data.newPassword) {
    data.passwordHash = await hashPassword(parsed.data.newPassword);
    data.mustChangePassword = true;
    // Reset lockout counters in case the user was locked out
    data.failedAttempts = 0;
    data.lockedUntil = null;
  }

  const updated = await db.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      twoFactorEnabled: true,
      mustEnable2FA: true,
      mustChangePassword: true,
      updatedAt: true,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "user.update",
    entity: "User",
    entityId: id,
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent") || undefined,
    meta: JSON.stringify({
      targetEmail: target.email,
      changes: Object.keys(data),
      passwordReset: !!parsed.data.newPassword,
    }),
  });

  return NextResponse.json({ user: updated });
}, { method: "PUT", requiredRole: "ADMIN" });

/**
 * DELETE /api/admin/users/[id]
 * Permanently deletes a user account.
 *
 * Safety:
 *   - An admin cannot delete themselves
 *   - Cannot delete the last active ADMIN
 *
 * Requires ADMIN role. Audit-logged.
 */
export const DELETE = adminHandler(async (req, user, ctx) => {
  const id = ctx.params?.id;
  if (!isValidId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  if (id === user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account. Ask another admin to do it." },
      { status: 400 }
    );
  }

  const target = await db.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Prevent deleting the last active ADMIN
  if (target.role === "ADMIN" && target.isActive) {
    const adminCount = await db.user.count({
      where: { role: "ADMIN", isActive: true, NOT: { id } },
    });
    if (adminCount === 0) {
      return NextResponse.json(
        { error: "Cannot delete the last active admin. Promote another user first." },
        { status: 400 }
      );
    }
  }

  await db.user.delete({ where: { id } });

  await writeAuditLog({
    userId: user.id,
    action: "user.delete",
    entity: "User",
    entityId: id,
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent") || undefined,
    meta: JSON.stringify({ deletedEmail: target.email, deletedRole: target.role }),
  });

  return NextResponse.json({ ok: true });
}, { method: "DELETE", requiredRole: "ADMIN" });
