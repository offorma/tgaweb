/**
 * Prisma migration script for Trail Gliders Academy.
 *
 * This script:
 * 1. Pushes the schema to the database (creates/updates tables)
 * 2. Generates the Prisma client
 * 3. Seeds the database with default content
 * 4. Seeds hero slides
 * 5. Runs the security migration (admin role, security policy)
 *
 * Run with:
 *   bun run scripts/migrate.ts
 *   npm run migrate
 *   ./run.sh migrate
 *
 * For production PostgreSQL:
 *   1. Change prisma/schema.prisma: provider = "postgresql"
 *   2. Set DATABASE_URL in .env to your PostgreSQL connection string
 *   3. Run: bun run scripts/migrate.ts
 */

import { execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

async function main() {
  const isBun = typeof Bun !== 'undefined';
  const runner = isBun ? 'bun' : 'npx tsx';
  const dbProvider = process.env.DATABASE_URL?.startsWith('postgresql') ? 'PostgreSQL' : 'SQLite';

  console.log('═══════════════════════════════════════════════════');
  console.log('  Trail Gliders Academy — Database Migration');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Database: ${dbProvider}`);
  console.log(`  Runner: ${runner}`);
  console.log(`  DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || '(not set)'}`);
  console.log('═══════════════════════════════════════════════════\n');

  // Step 1: Generate Prisma Client
  console.log('▶ Step 1/5: Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit', cwd: process.cwd() });
  console.log('✓ Prisma Client generated\n');

  // Step 2: Push schema to database
  console.log('▶ Step 2/5: Pushing schema to database...');
  execSync('npx prisma db push', { stdio: 'inherit', cwd: process.cwd() });
  console.log('✓ Schema pushed\n');

  // Step 3: Seed default content
  console.log('▶ Step 3/5: Seeding default content (admin user + site settings)...');
  execSync(`${runner} scripts/seed.ts`, { stdio: 'inherit', cwd: process.cwd() });
  console.log('✓ Content seeded\n');

  // Step 4: Seed hero slides
  console.log('▶ Step 4/5: Seeding hero slides...');
  execSync(`${runner} scripts/seed-slides.ts`, { stdio: 'inherit', cwd: process.cwd() });
  console.log('✓ Slides seeded\n');

  // Step 5: Security migration
  console.log('▶ Step 5/5: Running security migration...');
  execSync(`${runner} scripts/migrate-security.ts`, { stdio: 'inherit', cwd: process.cwd() });
  console.log('✓ Security migration complete\n');

  console.log('═══════════════════════════════════════════════════');
  console.log('  ✅ Migration Complete!');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('  Default admin credentials:');
  console.log('    Email:    admin@trailgliders.edu.ng');
  console.log('    Password: TrailGliders2026!');
  console.log('');
  console.log('  ⚠️  Change the password immediately after first login.');
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch((e) => {
  console.error('\n❌ Migration failed:', e.message);
  process.exit(1);
});
