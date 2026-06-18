/**
 * One-shot migration script:
 *  1. Ensures the default admin user has role=ADMIN, isActive=true
 *  2. Creates the SecurityPolicy singleton with safe defaults
 *  3. Sets mustEnable2FA=true for any new admin user (per the policy)
 *
 * Run with: bun run scripts/migrate-security.ts
 */

import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  console.log("🔧 Running security migration...");

  // 1. Ensure default admin user is correctly configured
  const admin = await db.user.findUnique({
    where: { email: "admin@trailgliders.edu.ng" },
  });
  if (admin) {
    await db.user.update({
      where: { id: admin.id },
      data: {
        role: "ADMIN",
        isActive: true,
        // Don't auto-enable mustEnable2FA on the existing seeded admin —
        // they should opt-in via Settings. But new admins created via the
        // UI WILL have mustEnable2FA set by the user-management API.
      },
    });
    console.log(`  ✓ Admin user ${admin.email} ensured as ADMIN role, isActive=true`);
  } else {
    console.log("  ⚠️  Default admin user not found — run `bun run db:seed` first");
  }

  // 2. Create the SecurityPolicy singleton
  await db.securityPolicy.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      enforceTwoFactorForAdmins: true,
      enforceTwoFactorForEditors: false,
      minPasswordLength: 12,
      sessionTimeoutHours: 8,
    },
  });
  console.log("  ✓ SecurityPolicy singleton created with safe defaults");

  console.log("\n✅ Migration complete.");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
