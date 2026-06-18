GitHub Actions → cPanel Deployment Guide

This guide explains how to automatically deploy Trail Gliders Academy to cPanel using GitHub Actions, and how to test feature branches without touching production.

The project includes **4 GitHub workflows** that cover production deploys, PR checks, E2E testing, and staging deploys.

---

## Workflow overview

| Workflow | File | Trigger | Purpose |
|---|---|---|---|
| **Deploy to cPanel** | `deploy.yml` | Push to `main`, tags `v*`, manual | Production deploy |
| **PR Check** | `pr-check.yml` | PRs, push to non-main branches | Lint + build verification |
| **E2E Tests** | `e2e.yml` | PRs, push to feature branches | 103 Playwright tests + fresh Postgres |
| **Deploy to Staging** | `staging.yml` | PRs (opt-in via `STAGING_ENABLED`) | Feature branch → staging subdomain |

**Production** is only touched by `deploy.yml` on push to `main`. PRs and feature branches run tests in CI and optionally deploy to staging — never production.

---

## Architecture

```
  GitHub repo
     │
     ├── push to main ──→ deploy.yml
     │                       │
     │                       ▼
     │                   ┌─────────────────────────┐
     │                   │  GitHub Actions runner  │
     │                   │                         │
     │                   │  1. npm ci              │
     │                   │  2. prisma generate     │
     │                   │  3. npm run build       │
     │                   │  4. stage artifacts     │
     │                   │  5. rsync → cPanel      │
     │                   │  6. ssh: post-deploy.sh │
     │                   └─────────────────────────┘
     │                       │
     │                       │ SSH (port 22 or 21098)
     │                       ▼
     │                   ┌─────────────────────────┐
     │                   │  cPanel server          │
     │                   │                         │
     │                   │  ~/trailgliders/        │
     │                   │    ├── server.js        │  ← new
     │                   │    ├── .next/static/    │  ← new
     │                   │    ├── public/          │  ← new
     │                   │    ├── prisma/          │  ← new
     │                   │    ├── node_modules/    │  ← kept + updated
     │                   │    ├── .env (cPanel UI) │  ← PRESERVED
     │                   │    ├── backups/         │  ← PRESERVED
     │                   │    └── logs/            │  ← PRESERVED
     │                   │                         │
     │                   │  → post-deploy.sh:      │
     │                   │    prisma db push       │
     │                   │    touch tmp/restart.txt│
     │                   └─────────────────────────┘
     │                       │
     │                       ▼
     │                   https://yourdomain.com
     │                       │
     │                       │  PostgreSQL (external or cPanel)
     │                       │  ← PRESERVED (not a file)
     │
     ├── PR / feature branch ──→ e2e.yml
     │                              │
     │                              ▼
     │                          ┌─────────────────────────┐
     │                          │  GitHub Actions runner  │
     │                          │                         │
     │                          │  1. Build feature branch│
     │                          │  2. Start Postgres 16   │
     │                          │     service container   │
     │                          │  3. db push + seed      │
     │                          │  4. Start Next.js       │
     │                          │  5. Run Playwright      │
     │                          │     (103 tests)         │
     │                          │  6. Upload reports      │
     │                          └─────────────────────────┘
     │                              │
     │                              ▼
     │                          PR check: ✅ / ❌
     │                          + test report comment
     │
     └── PR (if STAGING_ENABLED=true) ──→ staging.yml
                                          │
                                          ▼
                                      Deploy to staging subdomain
                                      + comment PR with URL
```

---

## Files involved

| File | Purpose |
|---|---|
| `.github/workflows/deploy.yml` | Production deploy pipeline (push to `main`) |
| `.github/workflows/pr-check.yml` | Lightweight CI on PRs (lint + build) |
| `.github/workflows/e2e.yml` | E2E test pipeline (Playwright + Postgres) |
| `.github/workflows/staging.yml` | Staging deploy pipeline (feature branches) |
| `scripts/cpanel-post-deploy.sh` | Runs ON cPanel after sync — installs deps, prisma db push, restart |
| `scripts/cpanel-deploy.sh` | Manual local-to-cPanel deploy (no GitHub needed) |
| `playwright.config.ts` | Playwright configuration |
| `e2e/smoke.spec.ts` | Smoke tests (homepage, listing pages, 404s) |
| `e2e/admin.spec.ts` | Admin tests (login, CRUD, security) |
| `e2e/i18n.spec.ts` | i18n tests (locale routing, hreflang, fallback) |
| `docs/STAGING-SETUP.md` | Staging subdomain setup guide |
| `GITHUB-ACTIONS-DEPLOY.md` | This guide |

---

## Part 1: Production deploy setup (`deploy.yml`)

### Prerequisites

- A GitHub repo with your project pushed to it
- cPanel hosting with **SSH access enabled**
- A **Node.js app already set up** in cPanel (follow [`DEPLOYMENT.md`](./DEPLOYMENT.md) Steps 1–6 first)
- **PostgreSQL database** configured and seeded (the app uses Postgres, not SQLite)
- The app reachable at your domain (e.g. `https://trailgliders.com.ng/en/`)

> **First-time setup tip**: Do the manual cPanel setup in `DEPLOYMENT.md` once before turning on GitHub Actions. That way the database, env vars, and Node app config are already in place — the pipeline just refreshes the code.

### Step 1 — Generate an SSH key for GitHub Actions

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy@trailgliders" -f ~/.ssh/trailgliders-deploy
```

- Press Enter when asked for a passphrase (the key must work non-interactively from CI)
- This creates:
   - `~/.ssh/trailgliders-deploy` — **PRIVATE key** (goes to GitHub)
   - `~/.ssh/trailgliders-deploy.pub` — **PUBLIC key** (goes to cPanel)

### Step 2 — Add the public key to cPanel

1. Log in to cPanel
2. Go to **SSH Access → Manage SSH Keys → ImportKey**
3. Pick a name (e.g. `trailgliders-deploy`)
4. Paste the contents of `~/.ssh/trailgliders-deploy.pub`
5. Click **Import** → **Manage** → **Authorize**

Test the connection:
```bash
ssh -i ~/.ssh/trailgliders-deploy -p 22 youruser@yourserver.com "whoami; pwd"
```

> **Namecheap / Bluehost users**: SSH port is often `21098` instead of `22`. Check your hosting welcome email.

### Step 3 — Capture the cPanel host fingerprint

```bash
ssh-keyscan -H -p 22 yourserver.com > known_hosts.txt
cat known_hosts.txt
```

Copy this output — you'll paste it as a GitHub Secret.

### Step 4 — Find your cPanel app settings

| Setting | Where to find it | Example |
|---|---|---|
| `CPANEL_HOST` | cPanel URL hostname | `server123.hosting.com` |
| `CPANEL_USER` | Top-right of cPanel dashboard | `myuserna` |
| `CPANEL_PORT` | Usually `22`, sometimes `21098` | `22` |
| `CPANEL_PATH` | `pwd` in cPanel Terminal after `cd ~/trailgliders` | `/home/myuserna/trailgliders` |
| `CPANEL_APP_NAME` | cPanel → Setup Node.js App → Application Name | `trailgliders` |

### Step 5 — Add GitHub Secrets

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**.

You need **two groups** of secrets: SSH connection secrets (for rsync/SSH access) and **app environment secrets** (for the `.env` file that gets written to the server).

#### SSH connection secrets (7)

| Secret name | Value |
|---|---|
| `CPANEL_HOST` | Your cPanel server hostname |
| `CPANEL_USER` | Your cPanel username |
| `CPANEL_PORT` | SSH port (`22` or `21098`) |
| `CPANEL_PATH` | Absolute path on cPanel (`/home/USER/trailgliders`) |
| `CPANEL_APP_NAME` | Node.js app name from cPanel |
| `CPANEL_SSH_KEY` | Entire contents of the PRIVATE key file |
| `CPANEL_KNOWN_HOSTS` | Output from `ssh-keyscan -H -p PORT HOST` |

#### App environment secrets (4) — ⚠️ CRITICAL

These secrets are written to a `.env` file on the cPanel server during each deploy. The post-deploy script sources this file before running `prisma db push`, and the Node.js app reads it at runtime.

**Without these, `prisma db push` fails and the app won't start.**

| Secret name | Value | Example |
|---|---|---|
| `PROD_DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?schema=public` |
| `PROD_NEXTAUTH_SECRET` | Random 32+ char string | `openssl rand -base64 32` |
| `PROD_NEXTAUTH_URL` | Your production URL | `https://trailgliders.com.ng` |
| `PROD_SECRETS_MASTER_KEY` | Random 32+ char string | `openssl rand -base64 48` |

> **Why GitHub Secrets instead of cPanel UI env vars?**
> cPanel's "Setup Node.js App → Environment variables" only injects vars into the Passenger-managed Node process — NOT into SSH sessions. The post-deploy script runs via SSH and needs `DATABASE_URL` for `prisma db push`. By writing a `.env` file from GitHub Secrets, both the SSH session AND the running app have access to the same env vars.

#### Total: 11 GitHub Secrets (7 SSH + 4 app env)

### Step 6 — Push to main

```bash
git add .github/workflows/ scripts/cpanel-post-deploy.sh scripts/cpanel-deploy.sh
git commit -m "ci: add GitHub Actions deploy pipeline"
git push origin main
```

The push triggers the first deploy. Watch it live:
1. Go to `https://github.com/YOUR-ORG/trail-gliders-academy/actions`
2. Click the top run ("Deploy to cPanel")
3. Build job (~3–5 min) → Deploy job (~1–2 min) → green checkmarks

### Step 7 — Verify

1. Visit `https://yourdomain.com/en/` — site loads
2. Visit `https://yourdomain.com/admin/login` — login works
3. SSH in and check the deploy log:
   ```bash
   ssh -p 22 youruser@yourserver.com
   tail -20 ~/trailgliders/logs/deploy-history.log
   ```

You should see entries like:
```
2026-06-18T13:05:12Z | commit=abc1234 | version=v1.2.3 | user=github-actions | host=server123.hosting.com
```

---

## Part 2: E2E test setup (`e2e.yml`)

**No setup required** — E2E tests run automatically on every PR and feature branch push.

The workflow:
1. Builds your feature branch
2. Starts a fresh PostgreSQL 16 service container (isolated, thrown away after the run)
3. Pushes the Prisma schema + seeds the database
4. Starts the Next.js server inside the runner
5. Runs 103 Playwright tests across 3 files:
   - **Smoke tests** — homepage × 5 locales, all listing pages, detail pages, 404s, API health
   - **Admin tests** — login, dashboard, CRUD (create news → verify on public site → delete), auth security
   - **i18n tests** — locale routing, language switcher, hreflang tags, content fallback
6. Uploads artifacts: build payload, HTML report, JUnit XML, server logs
7. Publishes test results to the PR checks UI + comments summary on the PR

### Running E2E tests locally

```bash
# One-time: install Playwright browsers
npm run e2e:install

# Start a Postgres instance and set DATABASE_URL
# (e.g. docker run -e POSTGRES_PASSWORD=tga -p 5432:5432 postgres:16)

# Push schema + seed
npm run db:push
npm run db:seed --force
npm run seed:slides
npm run migrate:security
npm run backfill:slugs

# Build + start server
npm run build
(cd .next/standalone && DATABASE_URL=... PORT=3000 node server.js &)

# Run tests
npm run e2e

# Or open interactive UI
npm run e2e:ui

# View HTML report
npm run e2e:report
```

---

## Part 3: Staging deploy setup (`staging.yml`)

Staging deploys are **opt-in**. They require a separate staging subdomain + database on your cPanel, plus additional GitHub Secrets.

👉 **Full setup guide**: see [`docs/STAGING-SETUP.md`](./docs/STAGING-SETUP.md)

### Quick summary

1. Create a staging subdomain in cPanel (e.g. `staging.trailgliders.com.ng`)
2. Set up a second Node.js app pointing to `~/trailgliders-staging`
3. Create a **separate PostgreSQL database** for staging (never reuse production!)
4. Add staging GitHub Secrets: `STAGING_CPANEL_HOST`, `STAGING_CPANEL_USER`, `STAGING_CPANEL_PORT`, `STAGING_CPANEL_PATH`, `STAGING_CPANEL_APP_NAME`, `STAGING_CPANEL_SSH_KEY`, `STAGING_CPANEL_KNOWN_HOSTS`, `STAGING_DATABASE_URL`, `STAGING_NEXTAUTH_URL`, `STAGING_NEXTAUTH_SECRET`, `STAGING_SECRETS_MASTER_KEY`
5. Add a GitHub **Variable** (not secret): `STAGING_ENABLED = true`
6. Push a feature branch → staging auto-deploys + comments on the PR with the URL

### Disabling staging

Set `STAGING_ENABLED = false` (or delete the variable). The workflow will still build but skip the deploy step. E2E tests still run.

---

## How the production deploy pipeline works (deep dive)

### Trigger conditions

`deploy.yml` runs when:
- You push to `main` or `master` (excluding `.md` files and `docs/`)
- You push a tag like `v1.2.3` (creates a tagged release)
- You manually trigger it: **Actions → Deploy to cPanel → Run workflow**

It does NOT run on:
- Pull requests (those run `pr-check.yml` + `e2e.yml`)
- Feature branches (those run `e2e.yml` + optionally `staging.yml`)

### Concurrency

If you push 5 commits in quick succession, only the **latest** deploys. Earlier in-flight deploys queue up and run sequentially (no cancellation mid-deploy):

```yaml
concurrency:
  group: deploy-cpanel-${{ github.ref }}
  cancel-in-progress: false
```

### Build job

1. Checks out the repo (with full history for `git describe`)
2. Sets up Node 20 + Bun 1.1
3. Runs `npm ci` (or `bun install --frozen-lockfile` if `bun.lock` exists)
4. Runs `npx prisma generate`
5. Runs `npm run build` — produces `.next/standalone/server.js`
6. Stages everything into `deploy-payload/app/`:
   - Standalone server + bundled node_modules
   - `.next/static` (CSS/JS chunks)
   - `public/` (images, fonts)
   - `prisma/` (schema)
   - `scripts/` (seed scripts)
   - `package.json` + lockfile
7. Uploads the payload as a GitHub Actions artifact

### Deploy job

1. Downloads the build artifact
2. Configures SSH with the private key from secrets
3. Tests SSH connection
4. Creates `backups/` and `logs/` directories if missing
5. **Backs up** the current deployment to `backups/rollback-YYYYMMDD-HHMMSS.tgz` (keeps last 5)
6. **rsync** with `--delete` and excludes for:
   - `.env*` — preserves env vars (set via cPanel UI)
   - `backups/` — preserves rollback history
   - `logs/` — preserves deploy logs
   - `node_modules/.cache/`, `.next/cache/` — preserves build caches
   - `uploads/`, `tmp/` — preserves user uploads
7. Uploads `cpanel-post-deploy.sh`
8. SSHes in and runs `./post-deploy.sh`

### Post-deploy script

The `post-deploy.sh` script (runs ON cPanel) does:

1. **Installs production deps** — only if `package.json` changed (idempotent)
2. **Generates Prisma client** — matches the freshly-deployed schema
3. **Runs `prisma db push`** — applies schema changes to PostgreSQL (additive; never drops data unless schema requires it)
4. **Restarts the Node.js app** — three methods, tried in order:
   - `touch tmp/restart.txt` (Phusion Passenger)
   - `uapi Nodejs restart_app app_name=...` (cPanel UAPI)
   - `passenger-config restart-app` (if available)
5. **Writes deploy history** to `logs/deploy-history.log`

### What's preserved between deploys

The rsync `--exclude` list ensures these NEVER get overwritten:
- Environment variables (set via cPanel UI, not files)
- PostgreSQL database (external — rsync can't touch it)
- `backups/` — previous deployments for rollback
- `logs/` — deploy history and runtime logs
- `uploads/`, `tmp/` — temp files including `restart.txt`

### What's replaced every deploy

Everything else, including:
- `server.js` and the entire `.next/standalone/` bundle
- `.next/static/` — JS/CSS chunks (with content hashes for cache busting)
- `public/` — static assets
- `prisma/schema.prisma` — schema definition
- `package.json` + lockfile
- `scripts/` — seed scripts

---

## Manual operations

### Trigger a production deploy manually

1. Go to **Actions → Deploy to cPanel**
2. Click **Run workflow** (top right)
3. Choose branch (`main` for production)
4. Optional: **Skip build** to reuse existing artifacts (faster)
5. Click **Run workflow**

### Rollback to previous deployment

```bash
# List available rollbacks
ssh -p 22 youruser@yourserver.com "ls -t ~/trailgliders/backups/rollback-*.tgz"

# Roll back to a specific one
ssh -p 22 youruser@yourserver.com <<EOF
cd ~/trailgliders
tar -xzf backups/rollback-20260618-120000.tgz
touch tmp/restart.txt
EOF
```

The site reverts within ~5 seconds.

### Local manual deploy (no GitHub)

```bash
cat > .env.deploy <<EOF
CPANEL_HOST=server123.hosting.com
CPANEL_USER=myuserna
CPANEL_PORT=22
CPANEL_PATH=/home/myuserna/trailgliders
CPANEL_APP_NAME=trailgliders
EOF

./scripts/cpanel-deploy.sh
```

---

## Troubleshooting

### "Permission denied (publickey)"

The SSH key isn't being accepted by cPanel. Check:
1. Did you **Authorize** the public key in cPanel → SSH Access → Manage SSH Keys?
2. Is the private key in `CPANEL_SSH_KEY` the **full file** including `-----BEGIN/END-----` lines?
3. No trailing newline in the secret value?
4. Is `CPANEL_PORT` correct? Namecheap uses `21098`.

Test locally first:
```bash
ssh -i ~/.ssh/trailgliders-deploy -p PORT youruser@yourserver.com "echo ok"
```

### "Host key verification failed"

The `CPANEL_KNOWN_HOSTS` secret is wrong or missing. Re-run:
```bash
ssh-keyscan -H -p PORT HOST > known_hosts.txt
```
Update the secret with the new contents. Or remove the secret — the workflow falls back to `ssh-keyscan` at runtime (less secure).

### "rsync: connection unexpectedly closed"

cPanel sometimes blocks rsync. Check:
1. Is `rsync` installed on cPanel? `ssh youruser@yourserver.com "which rsync"`
2. Memory limits — shared cPanel has tight limits. The runner retries on failure.

### Build succeeds but site doesn't update

1. **App didn't restart** — Check cPanel → Setup Node.js App → click **Restart** manually
2. **Browser cache** — Hard refresh (Ctrl+Shift+R) or incognito
3. **CDN cache** — If behind Cloudflare, purge the cache

### "prisma db push" fails

This means `DATABASE_URL` is not available when the post-deploy script runs via SSH.

**Root cause**: cPanel's "Setup Node.js App → Environment variables" UI only injects vars into the Passenger-managed Node process — NOT into SSH sessions. The post-deploy script runs via SSH and can't see those vars.

**Fix**: The deploy workflow writes a `.env` file from GitHub Secrets. Make sure you've added these 4 secrets:

| Secret | Value |
|---|---|
| `PROD_DATABASE_URL` | `postgresql://user:pass@host:5432/db?schema=public` |
| `PROD_NEXTAUTH_SECRET` | (random 32+ chars) |
| `PROD_NEXTAUTH_URL` | `https://yourdomain.com` |
| `PROD_SECRETS_MASTER_KEY` | (random 32+ chars) |

After adding the secrets, re-run the workflow. The "Write .env from secrets" step will create the `.env` file on the server, and the post-deploy script will source it before running `prisma db push`.

**Verify the .env was written**: SSH in and check:
```bash
cat ~/trailgliders/.env
# Should show DATABASE_URL=postgresql://...
```

**If .env exists but prisma still fails**: Check the post-deploy log for the `DATABASE_URL is set` line. If it says "not set", the .env file is malformed (check for line-break issues in the secret value).

### Detail pages return 404 after deploy

Slugs are missing. Run:
```bash
ssh -p 22 youruser@yourserver.com
cd ~/trailgliders
npm run backfill:slugs
```

### Locale URLs (/en/, /fr/) return 404

The next-intl middleware isn't deployed or the app didn't restart. Check:
1. `src/middleware.ts` exists on the server
2. `src/i18n/routing.ts` and `src/i18n/request-config.ts` exist
3. Restart the app in cPanel

### First deploy creates a fresh database (BAD!)

You probably forgot to exclude something in rsync. Check the workflow's rsync command — it should have `--exclude='.env*'`. But since the database is PostgreSQL (external), rsync can't touch it. If you see empty content, the database wasn't seeded:

```bash
ssh youruser@yourserver.com
cd ~/trailgliders
npm run db:seed --force
npm run seed:slides
npm run migrate:security
npm run backfill:slugs
```

### E2E tests fail with "connection refused"

The Next.js server didn't start. Check the `server-logs` artifact in the Actions run. Common causes:
- Missing env vars (the workflow sets placeholders — make sure they're valid)
- Build failed silently
- Prisma client wasn't generated

### E2E tests fail on admin login

The seeded admin credentials are:
- Email: `admin@trailgliders.edu.ng`
- Password: `TrailGliders2026!`

If the seed script changed these, update the env vars in `.github/workflows/e2e.yml`:
```yaml
env:
  ADMIN_EMAIL: your-new-email
  ADMIN_PASSWORD: your-new-password
```

### Workflow doesn't trigger on push

Check trigger conditions in the workflow file. `deploy.yml` ignores `.md` files:
```yaml
paths-ignore:
  - '**.md'
  - 'docs/**'
```
If your commit only changed `.md` files, the workflow won't run. Push a code change.

---

## Security considerations

### What's exposed
- The private SSH key is stored as a GitHub Secret — encrypted at rest, never logged
- The workflow deletes the key from the runner after the deploy
- GitHub Actions runners are ephemeral VMs — destroyed after the job

### What's NOT exposed
- Your cPanel password (we use SSH keys, not passwords)
- `SECRETS_MASTER_KEY`, `NEXTAUTH_SECRET`, app secrets (those live in cPanel's env vars, NOT GitHub)
- The PostgreSQL database (external — rsync can't reach it)

### Recommended hardening
1. **Use a dedicated SSH key** for GitHub Actions (not your personal one)
2. **Require manual approval for production deploys** — uncomment the `environment:` block in `deploy.yml` and configure required reviewers in GitHub Settings → Environments → production
3. **Rotate the SSH key annually** — generate new, update cPanel + GitHub, remove old
4. **Staging secrets are separate** from production secrets — never reuse `CPANEL_SSH_KEY` as `STAGING_CPANEL_SSH_KEY` unless they go to the same server (which is fine, but use different app paths)

---

## Cost

- **Public repos**: GitHub Actions is free, unlimited minutes
- **Private repos**: 2,000 free minutes/month on Free tier, 3,000 on Pro
- Each production deploy: ~5 minutes (3 build + 2 deploy)
- Each E2E test run: ~5-7 minutes
- Each staging deploy: ~3-5 minutes
- Total: ~400-600 runs/month on free tier — plenty for a school site

---

## Quick reference

### GitHub Secrets (production — 11 total)

**SSH connection (7):**

| Secret | Example |
|---|---|
| `CPANEL_HOST` | `server123.hosting.com` |
| `CPANEL_USER` | `myuserna` |
| `CPANEL_PORT` | `22` |
| `CPANEL_PATH` | `/home/myuserna/trailgliders` |
| `CPANEL_APP_NAME` | `trailgliders` |
| `CPANEL_SSH_KEY` | (entire private key file) |
| `CPANEL_KNOWN_HOSTS` | (output of `ssh-keyscan`) |

**App environment (4) — written to .env on server:**

| Secret | Example |
|---|---|
| `PROD_DATABASE_URL` | `postgresql://user:pass@host:5432/db?schema=public` |
| `PROD_NEXTAUTH_SECRET` | (output of `openssl rand -base64 32`) |
| `PROD_NEXTAUTH_URL` | `https://trailgliders.com.ng` |
| `PROD_SECRETS_MASTER_KEY` | (output of `openssl rand -base64 48`) |

### GitHub Secrets (staging — optional)

| Secret | Example |
|---|---|
| `STAGING_CPANEL_HOST` | (same as prod if same server) |
| `STAGING_CPANEL_USER` | (same as prod) |
| `STAGING_CPANEL_PORT` | `22` |
| `STAGING_CPANEL_PATH` | `/home/myuserna/trailgliders-staging` |
| `STAGING_CPANEL_APP_NAME` | `trailgliders-staging` |
| `STAGING_CPANEL_SSH_KEY` | (same key is fine) |
| `STAGING_CPANEL_KNOWN_HOSTS` | (same as prod) |
| `STAGING_DATABASE_URL` | (separate staging Postgres URL!) |
| `STAGING_NEXTAUTH_URL` | `https://staging.yourdomain.com` |
| `STAGING_NEXTAUTH_SECRET` | (generate new) |
| `STAGING_SECRETS_MASTER_KEY` | (generate new) |

### GitHub Variables (not secrets)

| Variable | Value | Purpose |
|---|---|---|
| `STAGING_ENABLED` | `true` | Enables staging deploys (opt-in) |

### Common commands

```bash
# Trigger production deploy manually
# Actions → Deploy to cPanel → Run workflow

# Watch a deploy live
# https://github.com/YOUR-ORG/trail-gliders-academy/actions

# Roll back on cPanel
ssh -p PORT user@host "cd ~/trailgliders && tar -xzf backups/rollback-TIMESTAMP.tgz && touch tmp/restart.txt"

# View deploy history on cPanel
ssh -p PORT user@host "tail -20 ~/trailgliders/logs/deploy-history.log"

# Manual local deploy
./scripts/cpanel-deploy.sh

# Run E2E tests locally
npm run e2e:install && npm run e2e

# Test SSH from your machine
ssh -i ~/.ssh/trailgliders-deploy -p PORT user@host "whoami"
```
