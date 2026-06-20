# Deploying Trail Gliders Academy on cPanel

This guide walks you through deploying the Trail Gliders Academy Next.js app on **shared cPanel hosting with CloudLinux Node.js Selector** (WGH Servers, Namecheap, HostGator, etc.).

---

## Prerequisites

- cPanel hosting with **CloudLinux Node.js Selector** (under Software section)
- Node.js 22+ available in the selector
- SSH access to the server
- Your domain pointed at the cPanel account
- PostgreSQL database created via cPanel

---

## Server layout

| What | Production | Staging |
|---|---|---|
| App root | `~/prod.trailglidersacademy.com.ng/` | `~/staging.trailglidersacademy.com.ng/` |
| Node.js version | 22 (`/opt/alt/alt-nodejs22/root/usr/bin`) | 24 (`/opt/alt/alt-nodejs24/root/usr/bin`) |
| Startup file | `server.js` | `server.js` |
| Static files | `~/public_html/prod.trailglidersacademy.com.ng/` | `~/public_html/staging.trailglidersacademy.com.ng/` |
| Deploy logs | `~/prod.trailglidersacademy.com.ng/logs/deploy-history.log` | `~/staging.trailglidersacademy.com.ng/logs/deploy-history.log` |
| App stdout/stderr | `~/prod` (Passenger output file) | `~/staging` (if exists) |
| Database | PostgreSQL via `127.0.0.200:5432` | PostgreSQL via `127.0.0.200:5432` |

---

## Step 1 -- Set up the Node.js app in cPanel

1. In cPanel, open **Software > Node.js Selector** (CloudLinux)
2. Click **Create Application**
3. Fill in:
   - **Node.js version**: 22.x (production) or 24.x (staging)
   - **Application mode**: Production
   - **Application root**: `prod.trailglidersacademy.com.ng`
   - **Application URL**: your domain
   - **Application startup file**: `server.js`
4. Click **Create**

---

## Step 2 -- Set environment variables (via cPanel UI)

Set environment variables in **Node.js Selector > your app > Environment variables**. This is more secure than `.env` files -- the vars are injected by Passenger into the running Node.js process only.

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://USER:PASS@127.0.0.200:5432/DB?schema=public` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | (random 32+ char string) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://prod.trailglidersacademy.com.ng` | Your production URL (no trailing slash) |
| `SECRETS_MASTER_KEY` | (random 48+ char string) | `openssl rand -base64 48` |
| `NODE_ENV` | `production` | |
| `HOSTNAME` | `0.0.0.0` | Required for Passenger to bind correctly |
| `PORT` | `3001` | Or whichever port Passenger assigns |

**Important**: cPanel UI env vars are only available to the Passenger-managed app process -- NOT to SSH sessions. When running scripts via SSH, you must export `DATABASE_URL` manually (see Step 4).

---

## Step 3 -- Deploy the app

### Option A: GitHub Actions (recommended)

Push to `main` -- the workflow in `.github/workflows/deploy.yml` handles everything:
1. Builds Next.js standalone bundle on GitHub runner
2. Generates and bundles Prisma client (with Linux query engine binaries)
3. Compiles TypeScript scripts to `scripts/dist/` (runnable with plain `node`)
4. Uploads tarball to cPanel via SCP
5. Pushes database schema via `prisma db push`
6. Restarts the app via Passenger

**Required GitHub Secrets** (Settings > Secrets and variables > Actions):

| Secret | Example |
|---|---|
| `CPANEL_HOST` | `131.153.148.82` |
| `CPANEL_USER` | `trailgli` |
| `CPANEL_PORT` | `22` |
| `CPANEL_PATH` | `/home2/trailgli/prod.trailglidersacademy.com.ng` |
| `CPANEL_APP_NAME` | `prod.trailglidersacademy.com.ng` |
| `CPANEL_SSH_KEY` | (entire private key file contents) |
| `PROD_DATABASE_URL` | `postgresql://...` |

For staging, also set:

| Secret/Variable | Notes |
|---|---|
| `STAGING_CPANEL_PATH` | `/home2/trailgli/staging.trailglidersacademy.com.ng` |
| `STAGING_DATABASE_URL` | Staging PostgreSQL connection string |
| `STAGING_ENABLED` | Set to `true` as a **repo variable** (not secret) |

### Option B: Manual local deploy

```bash
# Create .env.deploy (NOT committed)
cat > .env.deploy <<EOF
CPANEL_HOST=131.153.148.82
CPANEL_USER=trailgli
CPANEL_PORT=22
CPANEL_PATH=/home2/trailgli/prod.trailglidersacademy.com.ng
CPANEL_APP_NAME=prod.trailglidersacademy.com.ng
SSH_KEY=~/.ssh/trailgliders-deploy
NODE_BIN=/opt/alt/alt-nodejs22/root/usr/bin
EOF

./scripts/cpanel-deploy.sh
```

---

## Step 4 -- Seed the database (first deploy only)

After the first deploy, SSH into the server and seed the database. Since cPanel env vars are only injected by Passenger (not SSH), you must export `DATABASE_URL` manually:

```bash
ssh -i ~/.ssh/trailgliders-deploy -p 22 trailgli@131.153.148.82

# Set up PATH and DATABASE_URL
export PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH
cd ~/prod.trailglidersacademy.com.ng
export DATABASE_URL='postgresql://USER:PASS@127.0.0.200:5432/DB?schema=public'

# Seed all data
node scripts/dist/seed.js
node scripts/dist/seed-slides.js
node scripts/dist/migrate-security.js

# Restart the app
touch tmp/restart.txt
```

Or run the all-in-one migration script:
```bash
node scripts/dist/migrate.js
```

---

## Running scripts on cPanel

`tsx` is NOT available on cPanel. All TypeScript scripts are pre-compiled to `scripts/dist/` during the build and included in the deploy tarball. Use `node` to run them:

| Task | Local dev command | cPanel command |
|---|---|---|
| Seed database | `npm run db:seed` | `node scripts/dist/seed.js` |
| Seed hero slides | `npm run seed:slides` | `node scripts/dist/seed-slides.js` |
| Security migration | `npm run migrate:security` | `node scripts/dist/migrate-security.js` |
| Full migration | `npm run migrate` | `node scripts/dist/migrate.js` |
| Backfill slugs | `npm run backfill:slugs` | `node scripts/dist/backfill-slugs.js` |
| Push schema | `npm run db:push` | `npx prisma db push --skip-generate` |
| Re-seed (wipe + recreate) | `npm run db:seed -- --force` | `node scripts/dist/seed.js --force` |

**Always export `DATABASE_URL` first** when running scripts via SSH:
```bash
export PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH
export DATABASE_URL='postgresql://...'
```

---

## Viewing logs

### App runtime errors (most useful)

The Passenger output file is at `~/prod` (named after the domain):
```bash
cat ~/prod
tail -50 ~/prod
```

This shows Next.js startup messages and runtime errors like `TypeError`, Prisma errors, etc.

### Deploy history
```bash
cat ~/prod.trailglidersacademy.com.ng/logs/deploy-history.log
```

### Apache/NGINX access logs
```bash
ls ~/logs/
# Compressed logs: trailglidersacademy.com.ng-*.gz
```

### Check from your local machine (one-liner)
```bash
ssh -i ~/.ssh/trailgliders-deploy -p 22 trailgli@131.153.148.82 "tail -50 ~/prod"
```

---

## Step 5 -- Change the default admin password

1. Visit `https://prod.trailglidersacademy.com.ng/admin/login`
2. Sign in with: `admin@trailgliders.edu.ng` / `TrailGliders2026!`
3. Go to **Settings > Security tab**
4. Change the password to a strong one (12+ chars with upper/lower/digit/symbol)

---

## Step 6 -- Configure SMTP for the contact form

1. Sign in to admin > **Secrets Vault**
2. Click **Add from Template** > **SMTP Credentials**
3. Add: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
4. Each secret is encrypted with `SECRETS_MASTER_KEY` before storage

---

## Step 7 -- Set up SSL (HTTPS)

1. cPanel > **SSL/TLS Status** > **Run AutoSSL** for your domain
2. Verify: `https://prod.trailglidersacademy.com.ng` loads without warnings

---

## Step 8 -- Set up database backups

```bash
# Manual backup
PGPASSWORD="YOUR_DB_PASSWORD" pg_dump \
  --host=127.0.0.200 --port=5432 \
  --username=YOUR_DB_USER --dbname=YOUR_DB_NAME \
  --no-owner --no-acl --clean --if-exists \
  --file=~/backups/trailgliders-$(date +%Y%m%d).sql
```

### Automatic daily backup (cPanel Cron Job)
1. cPanel > **Cron Jobs**
2. Add a job that runs daily at 2 AM:
```
0 2 * * * PGPASSWORD="YOUR_DB_PASSWORD" pg_dump --host=127.0.0.200 --port=5432 --username=YOUR_DB_USER --dbname=YOUR_DB_NAME --no-owner --no-acl --clean --if-exists --file=/home2/trailgli/backups/trailgliders-$(date +\%Y\%m\%d).sql && find /home2/trailgli/backups/ -name "trailgliders-*.sql" -mtime +30 -delete
```

---

## Restarting the app

```bash
# Via SSH
touch ~/prod.trailglidersacademy.com.ng/tmp/restart.txt

# Via cPanel UI
# Node.js Selector > your app > Restart
```

---

## Rollback

Each deploy creates a backup in `~/prod.trailglidersacademy.com.ng/backups/`:
```bash
cd ~/prod.trailglidersacademy.com.ng
ls backups/rollback-*.tgz

# Restore a specific backup
tar -xzf backups/rollback-20260620-114100.tgz
touch tmp/restart.txt
```

---

## Troubleshooting

### App shows "Application error: a server-side exception has occurred"
1. Check the Passenger output: `cat ~/prod`
2. Common causes:
   - **Empty database** -- run `node scripts/dist/seed.js`
   - **Missing env vars** -- check Node.js Selector env vars in cPanel
   - **Schema out of sync** -- run `npx prisma db push --skip-generate` (with `DATABASE_URL` exported)

### "Cannot read properties of undefined (reading 'map')"
- Database tables exist but are empty. Run: `node scripts/dist/seed.js`

### "@prisma/client did not initialize yet"
- Prisma client was not bundled in the deploy tarball. Redeploy from GitHub Actions.

### "tsx: command not found"
- Use compiled scripts instead: `node scripts/dist/seed.js` (not `npm run db:seed`)

### Database access denied
- Check that the PostgreSQL user has permissions on the database
- In cPanel > PostgreSQL Databases > verify the user is assigned to the database

### Account lockout (too many failed logins)
- Wait 15 minutes, or SSH in and run:
  ```bash
  export PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH
  export DATABASE_URL='postgresql://...'
  cd ~/prod.trailglidersacademy.com.ng
  node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.updateMany({data:{failedAttempts:0,lockedUntil:null}}).then(()=>{console.log('Unlocked');p.\$disconnect()})"
  ```

---

## Security checklist

- [ ] Environment variables set via cPanel UI (not `.env` files)
- [ ] `NEXTAUTH_SECRET` and `SECRETS_MASTER_KEY` are strong random values
- [ ] Default admin password has been changed
- [ ] SSL/HTTPS is active
- [ ] Daily DB backups are configured via cPanel Cron Job
- [ ] cPanel account has 2FA enabled
- [ ] SMTP password is stored only in the Secrets Vault
- [ ] GitHub Secrets contain no expired or leaked credentials
- [ ] SSH deploy key is restricted to the deploy user only

---

## Build pipeline

The build process (both local and CI) runs these steps automatically:

1. `prisma generate` (via `prebuild` script in package.json)
2. `next build` (creates standalone bundle)
3. Copy `.next/static` and `public/` into standalone
4. `build:scripts` -- compiles TypeScript scripts to `scripts/dist/` via esbuild

The deploy tarball bundles:
- `.next/standalone/` (the app)
- `.next/static/` (CSS/JS chunks)
- `public/` (images, favicon, etc.)
- `prisma/` (schema file)
- `scripts/` (source + compiled `dist/`)
- `node_modules/@prisma`, `node_modules/.prisma`, `node_modules/prisma` (Prisma runtime + engine)
- `node_modules/bcryptjs` (needed by seed script)

This means cPanel does NOT need `npm install` -- everything the app needs is in the tarball.

---

Need help? Check the logs first (`cat ~/prod`), then check the deploy history, then reach out to the developer.
