export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminHandler, parseJsonBody } from "@/lib/admin-api";
import { db } from "@/lib/db";
import { hashPassword, writeAuditLog } from "@/lib/auth-utils";
import { UserCreateSchema } from "@/lib/validations/site";
import { getClientIp } from "@/lib/rate-limit";
import { sendWelcomeEmail } from "@/lib/email";

/**
 * GET /api/admin/users
 * Lists all admin users (excluding password hashes / 2FA secrets).
 * Requires ADMIN role.
 */
export const GET = adminHandler(async (req, user) => {
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
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
      // NEVER select: passwordHash, twoFactorSecret, twoFactorBackupCodes, failedAttempts, lockedUntil
    },
  });

  // Include creator name where applicable
  const creatorIds = [...new Set(users.map((u) => u.createdBy).filter(Boolean))] as string[];
  const creators = creatorIds.length
    ? await db.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const creatorMap = new Map(creators.map((c) => [c.id, c]));

  const safe = users.map((u) => ({
    ...u,
    creator: u.createdBy ? creatorMap.get(u.createdBy) : null,
  }));

  return NextResponse.json({ users: safe });
}, { method: "GET", requiredRole: "ADMIN" });

/**
 * POST /api/admin/users
 * Creates a new admin/editor user.
 *
 * The creating admin sets:
 *   - name + email + role
 *   - a temporary strong password (shared out-of-band with the new user)
 *   - whether 2FA is required on first login (default: true)
 *   - whether the temp password must be changed on first login (default: true)
 *
 * Requires ADMIN role. Audit-logged.
 */
export const POST = adminHandler(async (req, user) => {
  const body = await parseJsonBody(req);
  const parsed = UserCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Check for duplicate email
  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json(
      { error: `A user with email "${parsed.data.email}" already exists.` },
      { status: 409 }
    );
  }

  // Hash the temp password
  const passwordHash = await hashPassword(parsed.data.password);

  // Create the user. New users default to:
  //   - role: from request (ADMIN or EDITOR)
  //   - isActive: true
  //   - mustEnable2FA: from request (default true if role is ADMIN, else from policy)
  //   - mustChangePassword: from request (default true)
  //   - createdBy: the admin who created them
  const created = await db.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      role: parsed.data.role,
      isActive: true,
      mustEnable2FA: parsed.data.requireTwoFactor,
      mustChangePassword: parsed.data.requirePasswordChange,
      createdBy: user.id,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      mustEnable2FA: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "user.create",
    entity: "User",
    entityId: created.id,
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent") || undefined,
    meta: JSON.stringify({
      newUserId: created.id,
      newUserEmail: created.email,
      newUserRole: created.role,
      requireTwoFactor: parsed.data.requireTwoFactor,
      requirePasswordChange: parsed.data.requirePasswordChange,
    }),
  });

  // Send a branded welcome email to the new user (best-effort, fails soft).
  try {
    await sendWelcomeEmail({
      to: created.email,
      name: created.name,
      email: created.email,
      role: created.role,
      mustChangePassword: parsed.data.requirePasswordChange,
      requireTwoFactor: parsed.data.requireTwoFactor,
    });
  } catch (e: any) {
    console.error("[user.create] welcome email failed:", e?.message);
  }

  return NextResponse.json({ user: created }, { status: 201 });
}, { method: "POST", requiredRole: "ADMIN" });
