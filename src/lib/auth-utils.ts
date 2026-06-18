import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/**
 * Check if the user account is currently locked out due to too many failed attempts.
 * Returns the number of seconds remaining if locked, or 0 if not locked.
 */
export async function getLockoutRemaining(
  userId: string
): Promise<number> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.lockedUntil) return 0;
  const remaining = Math.ceil(
    (user.lockedUntil.getTime() - Date.now()) / 1000
  );
  if (remaining <= 0) return 0;
  return remaining;
}

/**
 * Record a failed login attempt. Locks account for 15 minutes after 5 failures.
 */
export async function recordFailedLogin(userId: string): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const attempts = user.failedAttempts + 1;
  const shouldLock = attempts >= 5;
  await db.user.update({
    where: { id: userId },
    data: {
      failedAttempts: attempts,
      lockedUntil: shouldLock
        ? new Date(Date.now() + 15 * 60 * 1000)
        : user.lockedUntil,
    },
  });
}

export async function recordSuccessfulLogin(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: {
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });
}

export async function writeAuditLog(opts: {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  ip?: string | null;
  userAgent?: string | null;
  meta?: string;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: opts.userId ?? null,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId,
        ip: opts.ip,
        userAgent: opts.userAgent,
        meta: opts.meta,
      },
    });
  } catch (e) {
    // never let audit logging break the request
    console.error("audit log failed:", e);
  }
}
