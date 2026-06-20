# GitHub Actions -> cPanel Deployment Guide

This guide explains how to automatically deploy Trail Gliders Academy to cPanel using GitHub Actions, and how to test feature branches without touching production.

The project includes **4 GitHub workflows** that cover production deploys, PR checks, E2E testing, and staging deploys.

---

## Workflow overview

| Workflow | File | Trigger | Purpose |
|---|---|---|---|
| **Deploy to cPanel** | `deploy.yml` | Push to `main`, tags `v*`, manual | Production deploy |
| **PR Check** | `pr-check.yml` | PRs, push to non-main branches | Lint + build verification |
| **E2E Tests** | `e2e.yml` | PRs, push to feature branches | Playwright tests + fresh Postgres |
| **Deploy to Staging** | `staging.yml` | PRs (opt-in via `STAGING_ENABLED`) | Feature branch -> staging subdomain |

**Production** is only touched by `deploy.yml` on push to `main`. PRs and feature branches run tests in CI and optionally deploy to staging -- never production.

---

## Architecture

```
  GitHub repo
     |
     +-- push to main --> deploy.yml
     |                       |
     |                       v
     |                   +---------------------------+
     |                   |  GitHub Actions runner     |
     |                   |                            |
     |                   |  1. npm ci                 |
     |                   |  2. prisma generate        |
     |                   |  3. npm run build          |
     |                   |     (includes build:scripts|
     |                   |      -> scripts/dist/*.js) |
     |                   |  4. Bundle Prisma +        |
     |                   |     bcryptjs into tarball   |
     |                   |  5. SCP tarball -> cPanel   |
     |                   |  6. prisma db push         |
     |                   |     (from runner, NOT cPanel)|
     |                   |  7. ssh: post-deploy.sh    |
     |                   +---------------------------+
     |                       |
     |                       | SSH
     |                       v
     |                   +---------------------------+
     |                   |  cPanel server (CloudLinux)|
     |                   |                            |
     |                   |  ~/prod.trailgliders       |
     |                   |  academy.com.ng/           |
     |                   |    +-- server.js           |
     |                   |    +-- .next/static/       |
     |                   |    +-- public/             |
     |                   |    +-- prisma/             |
     |                   |    +-- scripts/dist/       |
     |                   |    +-- node_modules/       |
     |                   |    |   @prisma, .prisma,   |
     |                   |    |   prisma, bcryptjs    |
     |                   |    +-- backups/  PRESERVED |
     |                   |    +-- logs/     PRESERVED |
     |                   |                            |
     |                   |  Env vars: cPanel Node.js  |
     |                   |  Selector UI (NOT .env)    |
     |                   |                            |
     |                   |  -> post-deploy.sh:        |
     |                   |    verify bundled deps     |
     |                   |    touch tmp/restart.txt   |
     |                   +---------------------------+
     |                       |
     |                       v
     |                   https://prod.trailgliders
     |                   academy.com.ng
     |
     +-- PR / feature branch --> e2e.yml
     |                              |
     |                              v
     |                          Playwright tests
     |                          (isolated Postgres)
     |
     +-- PR (if STAGING_ENABLED=true) --> staging.yml
                                          |
                                          v
                                      Deploy to staging subdomain
                                      + comment PR with URL
```

---

## Key design decisions

### Environment variables via cPanel UI (not .env files)

Environment variables (`DATABASE_URL`, `NEXTAUTH_SECRET`, etc.) are configured in **cPanel > Node.js Selector > Environment variables**. This is more secure than `.env` files because:
- Vars are injected by Passenger into the running Node.js process only
- No `.env` file to accidentally commit or expose
- Managed through cPanel's UI

**Trade-off**: cPanel UI env vars are NOT available in SSH sessions. This means:
- The running app has full access to all env vars (via `process.env`)
- SSH scripts (like `prisma db push`) cannot access them automatically
- The deploy workflow runs `prisma db push` from the GitHub Actions runner (not cPanel), using `PROD_DATABASE_URL` from GitHub Secrets
- When running scripts manually via SSH, you must `export DATABASE_URL=...` yourself

### Prisma runs in CI, not on cPanel

Both `prisma generate` and `prisma db push` run on the GitHub Actions runner:
- `prisma generate` produces the client + engine binaries, which are bundled in the tarball
- `prisma db push` syncs the schema, connecting to the database from the runner
- cPanel's jailshell blocks outbound internet, which would cause Prisma CLI to crash when trying to download engine binaries

### TypeScript scripts are pre-compiled

`tsx` is not available on cPanel. All TypeScript scripts in `scripts/` are compiled to `scripts/dist/*.js` via esbuild during `npm run build`. On cPanel, use `node scripts/dist/seed.js` instead of `npm run db:seed`.

---

## Files involved

| File | Purpose |
|---|---|
| `.github/workflows/deploy.yml` | Production deploy pipeline (push to `main`) |
| `.github/workflows/pr-check.yml` | Lightweight CI on PRs (lint + build) |
| `.github/workflows/e2e.yml` | E2E test pipeline (Playwright + Postgres) |
| `.github/workflows/staging.yml` | Staging deploy pipeline (feature branches) |
| `scripts/cpanel-post-deploy.sh` | Runs ON cPanel after extraction -- verifies deps, restarts app |
| `scripts/cpanel-deploy.sh` | Manual local-to-cPanel deploy (no GitHub needed) |
| `scripts/dist/*.js` | Pre-compiled scripts for running on cPanel with plain `node` |

---

## Part 1: Production deploy setup (`deploy.yml`)

### Prerequisites

- A GitHub repo with your project pushed to it
- cPanel hosting with **CloudLinux Node.js Selector** and SSH access
- A **Node.js app already set up** in cPanel (follow [`DEPLOYMENT.md`](./DEPLOYMENT.md))
- **PostgreSQL database** configured (the app uses Postgres)
- Environment variables set in cPanel Node.js Selector UI

### Step 1 -- Generate an SSH key for GitHub Actions

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy@trailgliders" -f ~/.ssh/trailgliders-deploy
```

- Press Enter for no passphrase (the key must work non-interactively from CI)

### Step 2 -- Add the public key to cPanel

1. cPanel > **SSH Access > Manage SSH Keys > Import Key**
2. Paste contents of `~/.ssh/trailgliders-deploy.pub`
3. Click **Import** > **Manage** > **Authorize**

Test:
```bash
ssh -i ~/.ssh/trailgliders-deploy -p 22 trailgli@131.153.148.82 "whoami"
```

### Step 3 -- Add GitHub Secrets

Go to repo > **Settings > Secrets and variables > Actions > New repository secret**.

#### SSH connection secrets

| Secret | Value |
|---|---|
| `CPANEL_HOST` | `131.153.148.82` |
| `CPANEL_USER` | `trailgli` |
| `CPANEL_PORT` | `22` |
| `CPANEL_PATH` | `/home2/trailgli/prod.trailglidersacademy.com.ng` |
| `CPANEL_APP_NAME` | `prod.trailglidersacademy.com.ng` |
| `CPANEL_SSH_KEY` | (entire private key file contents) |

#### Database secret (for schema push from CI)

| Secret | Value |
|---|---|
| `PROD_DATABASE_URL` | `postgresql://USER:PASS@127.0.0.200:5432/DB?schema=public` |

**Note**: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `SECRETS_MASTER_KEY`, and `NODE_ENV` are set via the cPanel Node.js Selector UI -- they do NOT need to be in GitHub Secrets.

### Step 4 -- Push to main

```bash
git push origin main
```

Watch live: **Actions > Deploy to cPanel**

### Step 5 -- Seed the database (first deploy only)

After the first deploy, SSH in and seed:

```bash
ssh -i ~/.ssh/trailgliders-deploy -p 22 trailgli@131.153.148.82

export PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH
cd ~/prod.trailglidersacademy.com.ng
export DATABASE_URL='postgresql://...'

node scripts/dist/seed.js
node scripts/dist/seed-slides.js
node scripts/dist/migrate-security.js
```

---

## Part 2: E2E test setup (`e2e.yml`)

**No setup required** -- runs automatically on every PR.

### Running E2E tests locally

```bash
npm run e2e:install
npm run build
npm run e2e

# Interactive UI
npm run e2e:ui
```

---

## Part 3: Staging deploy setup (`staging.yml`)

Staging deploys are **opt-in**.

### Setup

1. Create staging subdomain in cPanel
2. Set up a Node.js app in cPanel pointing to `~/staging.trailglidersacademy.com.ng`
3. Create a **separate PostgreSQL database** for staging
4. Set environment variables in cPanel Node.js Selector for the staging app
5. Add GitHub Secrets:

| Secret | Value |
|---|---|
| `STAGING_CPANEL_PATH` | `/home2/trailgli/staging.trailglidersacademy.com.ng` |
| `STAGING_CPANEL_APP_NAME` | `staging.trailglidersacademy.com.ng` |
| `STAGING_DATABASE_URL` | Staging PostgreSQL connection string |

6. Add a GitHub **Variable** (not secret): `STAGING_ENABLED = true`
7. Staging secrets fall back to production secrets if not set (same server)

---

## Running scripts on cPanel

`tsx` is NOT available on cPanel. Use pre-compiled scripts:

| Task | cPanel command |
|---|---|
| Seed database | `node scripts/dist/seed.js` |
| Seed hero slides | `node scripts/dist/seed-slides.js` |
| Security migration | `node scripts/dist/migrate-security.js` |
| Full migration | `node scripts/dist/migrate.js` |
| Backfill slugs | `node scripts/dist/backfill-slugs.js` |
| Re-seed (wipe) | `node scripts/dist/seed.js --force` |
| Push schema | `npx prisma db push --skip-generate` |

**Always set PATH and DATABASE_URL first:**
```bash
export PATH=/opt/alt/alt-nodejs22/root/usr/bin:$PATH
export DATABASE_URL='postgresql://...'
```

---

## Viewing logs

| Log | Location |
|---|---|
| App runtime errors | `cat ~/prod` (Passenger output) |
| Deploy history | `cat ~/prod.trailglidersacademy.com.ng/logs/deploy-history.log` |
| Apache/NGINX access | `~/logs/` (compressed) |

Quick check from local:
```bash
ssh -i ~/.ssh/trailgliders-deploy -p 22 trailgli@131.153.148.82 "tail -50 ~/prod"
```

---

## Rollback

```bash
ssh -i ~/.ssh/trailgliders-deploy -p 22 trailgli@131.153.148.82

cd ~/prod.trailglidersacademy.com.ng
ls backups/rollback-*.tgz
tar -xzf backups/rollback-YYYYMMDD-HHMMSS.tgz
touch tmp/restart.txt
```

---

## Manual local deploy (no GitHub)

```bash
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

## Troubleshooting

### "Application error: a server-side exception has occurred"
1. Check `cat ~/prod` for the actual error
2. Common causes:
   - Empty database -- run `node scripts/dist/seed.js`
   - Missing env vars -- check cPanel Node.js Selector
   - Schema out of sync -- run `prisma db push` from CI or locally with DATABASE_URL

### "Cannot read properties of undefined (reading 'map')"
Database tables exist but are empty. Seed them:
```bash
node scripts/dist/seed.js
node scripts/dist/seed-slides.js
```

### "tsx: command not found"
Use compiled scripts: `node scripts/dist/seed.js` (not `npm run db:seed`)

### Prisma CLI crashes on cPanel
This is expected -- cPanel's jailshell blocks engine binary downloads. All Prisma operations should run from CI or your local machine, never on cPanel directly.

### Database access denied (staging)
Check cPanel > PostgreSQL Databases > verify the staging user has permissions on the staging database.

### Build succeeds but site doesn't update
1. Restart: `touch ~/prod.trailglidersacademy.com.ng/tmp/restart.txt`
2. Or restart via cPanel Node.js Selector UI
3. Hard refresh browser (Cmd+Shift+R)

---

## Security considerations

- SSH private key is stored as a GitHub Secret (encrypted at rest, never logged)
- The workflow deletes the key from the runner after deploy
- Environment variables are in cPanel UI (not `.env` files, not in GitHub)
- Only `PROD_DATABASE_URL` is in GitHub Secrets (needed for schema push from CI)
- **Rotate credentials** if they are ever exposed in logs or output
