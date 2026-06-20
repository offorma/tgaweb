/**
 * Prisma migration script for Trail Gliders Academy.
 *
 * This script:
 * 1. Generates the Prisma client
 * 2. Pushes the schema to the database (creates/updates tables)
 * 3. Seeds the database with default content
 * 4. Seeds hero slides
 * 5. Runs the security migration (admin role, security policy)
 *
 * Run with:
 *   npx tsx scripts/migrate.ts        (local dev)
 *   node scripts/dist/migrate.js      (cPanel / production)
 *   npm run migrate
 *   ./run.sh migrate
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

async function main() {
  const dbProvider = process.env.DATABASE_URL?.startsWith('postgresql') ? 'PostgreSQL' : 'SQLite';

  // Detect whether we're running from compiled dist or source
  const distDir = join(__dirname, 'dist');
  const hasCompiledScripts = existsSync(join(distDir, 'seed.js'));

  // Use compiled scripts if available (cPanel), otherwise use tsx (local dev)
  const runScript = (name: string) => {
    if (hasCompiledScripts) {
      return `node ${join(distDir, name + '.js')}`;
    }
    const isBun = typeof globalThis.Bun !== 'undefined';
    return isBun ? `bun scripts/${name}.ts` : `npx tsx scripts/${name}.ts`;
  };

  console.log('═══════════════════════════════════════════════════');
  console.log('  Trail Gliders Academy — Database Migration');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Database: ${dbProvider}`);
  console.log(`  Scripts: ${hasCompiledScripts ? 'compiled (dist/)' : 'source (tsx)'}`);
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
  execSync(runScript('seed'), { stdio: 'inherit', cwd: process.cwd() });
  console.log('✓ Content seeded\n');

  // Step 4: Seed hero slides
  console.log('▶ Step 4/5: Seeding hero slides...');
  execSync(runScript('seed-slides'), { stdio: 'inherit', cwd: process.cwd() });
  console.log('✓ Slides seeded\n');

  // Step 5: Security migration
  console.log('▶ Step 5/5: Running security migration...');
  execSync(runScript('migrate-security'), { stdio: 'inherit', cwd: process.cwd() });
  console.log('✓ Security migration complete\n');

  console.log('═══════════════════════════════════════════════════');
  console.log('  ✅ Migration Complete!');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('  Default admin credentials:');
  console.log('    Email:    admin@trailgliders.edu.ng');
  console.log('    Password: TrailGliders2026!');
  console.log('');
  console.log('  Change the password immediately after first login.');
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch((e) => {
  console.error('\n Migration failed:', e.message);
  process.exit(1);
});
