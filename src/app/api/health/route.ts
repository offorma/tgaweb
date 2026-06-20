/**
 * GET /api/health — Diagnostic endpoint for troubleshooting deployment issues.
 * Returns system status without exposing sensitive data.
 *
 * Visit: https://prod.trailglidersacademy.com.ng/api/health
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {};

  // 1. Environment
  checks.nodeEnv = process.env.NODE_ENV || "(not set)";
  checks.nextAuthSecret = process.env.NEXTAUTH_SECRET ? "set (" + process.env.NEXTAUTH_SECRET.length + " chars)" : "NOT SET — login will fail";
  checks.nextAuthUrl = process.env.NEXTAUTH_URL || "NOT SET — CSRF may fail";
  checks.secretsMasterKey = process.env.SECRETS_MASTER_KEY ? "set" : "NOT SET";
  checks.databaseUrl = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace(/\/\/[^@]+@/, "//***:***@").substring(0, 60) + "..."
    : "NOT SET";

  // 2. Database connection
  try {
    const userCount = await db.user.count();
    checks.dbConnection = "OK";
    checks.userCount = userCount;

    if (userCount === 0) {
      checks.dbWarning = "No users in database — run seed script: node scripts/dist/seed.js";
    } else {
      // Check admin user specifically
      const admin = await db.user.findUnique({
        where: { email: "admin@trailgliders.edu.ng" },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          failedAttempts: true,
          lockedUntil: true,
          twoFactorEnabled: true,
          mustEnable2FA: true,
          mustChangePassword: true,
          lastLoginAt: true,
        },
      });
      if (admin) {
        checks.adminUser = {
          exists: true,
          role: admin.role,
          isActive: admin.isActive,
          failedAttempts: admin.failedAttempts,
          lockedUntil: admin.lockedUntil,
          twoFactorEnabled: admin.twoFactorEnabled,
          lastLoginAt: admin.lastLoginAt,
        };
        if (!admin.isActive) {
          checks.adminWarning = "Admin account is INACTIVE — cannot log in";
        }
        if (admin.lockedUntil && admin.lockedUntil > new Date()) {
          checks.adminWarning = `Account LOCKED until ${admin.lockedUntil.toISOString()} (too many failed attempts)`;
        }
        if (admin.failedAttempts >= 5) {
          checks.adminWarning = `Account has ${admin.failedAttempts} failed attempts — may be locked`;
        }
      } else {
        checks.adminUser = { exists: false };
        checks.adminWarning = "Default admin user not found — run seed script";
      }
    }

    // Check settings exist
    const settings = await db.siteSettings.findUnique({ where: { id: "singleton" } });
    checks.siteSettings = settings ? "OK" : "NOT FOUND — run seed script";

  } catch (e: unknown) {
    checks.dbConnection = "FAILED";
    checks.dbError = e instanceof Error ? e.message : String(e);
  }

  // 3. Runtime info
  checks.nodeVersion = process.version;
  checks.platform = process.platform;
  checks.arch = process.arch;
  checks.timestamp = new Date().toISOString();

  return NextResponse.json(checks, { status: 200 });
}
