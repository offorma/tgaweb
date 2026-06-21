/**
 * Seed the SMTP / email credentials into the encrypted secrets vault.
 *
 * These five keys power every outbound email (contact form, password reset,
 * signup welcome) — see src/lib/email.ts. The entries are always created (even
 * empty) so they appear in Admin > Secrets ready for the school to fill in.
 *
 * Idempotent and safe to run against an already-seeded database:
 *   npx tsx scripts/seed-email-secrets.ts          # create missing keys, keep existing values
 *   npx tsx scripts/seed-email-secrets.ts --force  # overwrite values from env vars too
 *
 * It is also invoked automatically by scripts/seed.ts during a full seed.
 */

import { db } from "../src/lib/db";
import { encryptSecret, isMasterKeyConfigured } from "../src/lib/secrets";

export const EMAIL_SECRET_KEYS = [
  {
    key: "SMTP_HOST",
    envValue: () => process.env.SMTP_HOST || "",
    description: "SMTP server hostname (e.g. smtp.gmail.com)",
  },
  {
    key: "SMTP_PORT",
    envValue: () => process.env.SMTP_PORT || "587",
    description: "SMTP port (587 for TLS, 465 for SSL)",
  },
  {
    key: "SMTP_USER",
    envValue: () => process.env.SMTP_USER || "",
    description: "SMTP username (usually the full email address)",
  },
  {
    key: "SMTP_PASSWORD",
    envValue: () => process.env.SMTP_PASSWORD || "",
    description: "SMTP password or app-specific password",
  },
  {
    key: "SMTP_FROM",
    envValue: () => process.env.SMTP_FROM || "",
    description: 'Default "From" email address (e.g. info@trailgliders.com.ng)',
  },
] as const;

export async function seedEmailSecrets({ force = false }: { force?: boolean } = {}) {
  if (!isMasterKeyConfigured()) {
    console.log("  ⚠ SECRETS_MASTER_KEY not set — skipping SMTP vault secrets.");
    console.log("    Set it in the environment, then re-run this script.");
    return;
  }

  for (const s of EMAIL_SECRET_KEYS) {
    const existing = await db.secret.findUnique({ where: { key: s.key } });
    if (existing && !force) {
      console.log(`  ⏭ Secret ${s.key} (already exists)`);
      continue;
    }
    const value = s.envValue();
    const { ciphertext, previewHint } = encryptSecret(value);
    await db.secret.upsert({
      where: { key: s.key },
      update: { ciphertext, previewHint, lastRotatedAt: new Date() },
      create: {
        key: s.key,
        category: "email",
        description: s.description,
        ciphertext,
        previewHint,
        lastRotatedAt: new Date(),
      },
    });
    console.log(`  ✓ Secret ${s.key}${value ? "" : " (empty — fill in Admin > Secrets)"}`);
  }
}

// Run directly (not when imported by seed.ts)
const isDirectRun =
  typeof process.argv[1] === "string" && process.argv[1].includes("seed-email-secrets");

if (isDirectRun) {
  const force = process.argv.includes("--force");
  console.log("📧 Seeding SMTP / email secrets into the vault...");
  seedEmailSecrets({ force })
    .then(() => console.log("✅ Done."))
    .catch((e) => {
      console.error("❌ Failed to seed email secrets:", e);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}