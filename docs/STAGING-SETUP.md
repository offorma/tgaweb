# Staging Environment Setup Guide

This guide walks you through setting up a **staging environment** on cPanel so feature branches can be tested without touching the live website.

## What you'll get

After setup, every pull request and feature branch push will:

1. **Build** the feature branch code
2. **Deploy** to a staging subdomain (e.g. `https://staging.trailgliders.com.ng`)
3. **Comment** on the PR with the staging URL
4. **Run E2E tests** against a fresh in-CI database (separate from staging)

The live website (`https://trailgliders.com.ng`) is **never affected** by staging deploys.

---

## Architecture

```
  GitHub PR / feature branch
            │
            ├──────────────────────────────────────┐
            │                                      │
            ▼                                      ▼
  ┌─────────────────────────┐         ┌─────────────────────────┐
  │  e2e.yml workflow       │         │  staging.yml workflow   │
  │  (in-CI tests)          │         │  (deploys to staging)   │
  │                         │         │                         │
  │  1. Build               │         │  1. Build feature       │
  │  2. Start Postgres      │         │     branch              │
  │     service container   │         │  2. rsync to staging    │
  │  3. db:push + db:seed   │         │     cPanel path         │
  │  4. Start Next.js       │         │  3. Run post-deploy.sh  │
  │  5. Run Playwright      │         │  4. Comment PR with     │
  │     E2E tests           │         │     staging URL         │
  │  6. Upload reports      │         │                         │
  └─────────────────────────┘         └─────────────────────────┘
            │                                      │
            ▼                                      ▼
  GitHub PR check status              https://staging.yourdomain.com
  (✅ or ❌ on the PR)                (manual browser testing)
```

The E2E tests run **inside the GitHub Actions runner** with a throwaway Postgres database. The staging deployment goes to your cPanel but uses a separate database. Neither touches production.

---

## Step 1 — Create a staging subdomain in cPanel

1. Log in to cPanel
2. Go to **Domains → Subdomains** (or **Domains → Domains** depending on your host)
3. Create a new subdomain:
   - **Subdomain:** `staging`
   - **Domain:** `trailgliders.com.ng` (your domain)
   - **Document Root:** `staging` (cPanel will create `/home/USERNAME/staging`)
4. Click **Create**

The subdomain `staging.trailgliders.com.ng` should now resolve (may take a few minutes for DNS).

> **Note**: The staging app won't actually live in `public_html/staging` — Node.js apps live in your home directory. The subdomain just needs to exist so cPanel routes requests for `staging.trailgliders.com.ng` correctly.

---

## Step 2 — Set up the staging Node.js app

1. In cPanel, go to **Software → Setup Node.js App**
2. Click **Create Application**
3. Fill in:
   - **Node.js version**: 20.x (same as production)
   - **Application mode**: Production
   - **Application root**: `trailgliders-staging` (the folder where staging code lives)
   - **Application URL**: select `staging.trailgliders.com.ng` from the dropdown
   - **Application startup file**: `server.js` (will exist after first deploy)
4. Click **Create**

Don't run `npm install` or build yet — the GitHub Actions workflow will handle that on the first deploy.

---

## Step 3 — Create a staging PostgreSQL database

**CRITICAL**: Use a **separate database** for staging. Never point staging at the production database — a bad migration on a feature branch could destroy live data.

### Option A: Same Postgres server, separate database

If your cPanel host provides PostgreSQL:

1. Go to cPanel → **Databases → PostgreSQL Databases**
2. Create a new database: `trailgliders_staging`
3. Create or reuse a database user, and **add the user to the staging database** with all privileges
4. Note the connection string — it'll look like:
   ```
   postgresql://USERNAME:PASSWORD@localhost:5432/USERNAME_trailgliders_staging?schema=public
   ```

### Option B: External Postgres (e.g. Neon, Supabase, Railway)

For easier management, use a free managed Postgres:

- **Neon** (https://neon.tech) — free tier, branching support
- **Supabase** (https://supabase.com) — free tier, 500MB
- **Railway** (https://railway.app) — free trial, $5/month after

Create a project, copy the connection string. It'll look like:
```
postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/trailgliders_staging
```

---

## Step 4 — Set staging environment variables in cPanel

In cPanel → **Setup Node.js App** → find your staging app → scroll to **Environment variables**:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | (your staging Postgres URL from Step 3) | **Must be different from production** |
| `NEXTAUTH_SECRET` | (generate with `openssl rand -base64 32`) | Can be same as prod, but recommended different |
| `NEXTAUTH_URL` | `https://staging.trailgliders.com.ng` | Your staging URL |
| `SECRETS_MASTER_KEY` | (generate with `openssl rand -base64 48`) | Can be same as prod |
| `NODE_ENV` | `production` | |

Generate secrets in cPanel Terminal:
```bash
openssl rand -base64 32    # for NEXTAUTH_SECRET
openssl rand -base64 48    # for SECRETS_MASTER_KEY
```

Click **Save** after adding all variables.

---

## Step 5 — Generate a staging SSH key (optional, can reuse production key)

If you want a separate SSH key for staging deploys (recommended for security isolation):

```bash
ssh-keygen -t ed25519 -C "github-actions-staging-deploy" -f ~/.ssh/trailgliders-staging-deploy
```

Add the **public key** to cPanel:
1. cPanel → **SSH Access → Manage SSH Keys → Import Key**
2. Name it `trailgliders-staging-deploy`
3. Paste the contents of `~/.ssh/trailgliders-staging-deploy.pub`
4. Click **Import** → **Manage** → **Authorize**

Test the connection:
```bash
ssh -i ~/.ssh/trailgliders-staging-deploy -p 22 YOURUSER@YOURHOST "echo 'SSH OK'"
```

> **Note**: You can reuse your production SSH key for staging — they're going to the same server. Just make sure the production key has access to both `~/trailgliders` and `~/trailgliders-staging`.

---

## Step 6 — Add GitHub Secrets for staging

In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**

Add each of these:

| Secret name | Value |
|---|---|
| `STAGING_CPANEL_HOST` | Your cPanel server hostname (e.g. `server123.hosting.com`) |
| `STAGING_CPANEL_USER` | Your cPanel username |
| `STAGING_CPANEL_PORT` | SSH port (22 or 21098 for Namecheap) |
| `STAGING_CPANEL_PATH` | Absolute path to staging app root (e.g. `/home/USERNAME/trailgliders-staging`) |
| `STAGING_CPANEL_APP_NAME` | Node.js app name from Step 2 (e.g. `trailgliders-staging`) |
| `STAGING_CPANEL_SSH_KEY` | Entire contents of the private key file (the one ending in `-deploy`, not `.pub`) |
| `STAGING_CPANEL_KNOWN_HOSTS` | Output of `ssh-keyscan -H -p PORT HOST` |
| `STAGING_DATABASE_URL` | Your staging Postgres URL from Step 3 |
| `STAGING_NEXTAUTH_URL` | `https://staging.trailgliders.com.ng` |
| `STAGING_NEXTAUTH_SECRET` | Same value as you set in cPanel env vars |
| `STAGING_SECRETS_MASTER_KEY` | Same value as you set in cPanel env vars |

### How to paste the SSH key

```bash
cat ~/.ssh/trailgliders-staging-deploy
```

Copy the **entire** output including `-----BEGIN/END OPENSSH PRIVATE KEY-----` lines. Paste as the `STAGING_CPANEL_SSH_KEY` secret.

### How to get the known_hosts

```bash
ssh-keyscan -H -p 22 YOURHOST > staging-known-hosts.txt
cat staging-known-hosts.txt
```

Copy the entire output and paste as `STAGING_CPANEL_KNOWN_HOSTS`.

---

## Step 7 — Enable the staging workflow

The staging workflow is gated behind a variable so it doesn't fail in forks that don't have staging set up. To enable it:

1. Go to **Settings → Secrets and variables → Actions**
2. Click the **Variables** tab (not Secrets)
3. Click **New repository variable**
4. Name: `STAGING_ENABLED`
5. Value: `true`
6. Click **Add variable**

Without this variable, the staging workflow will build but skip the deploy step. The E2E tests will still run.

---

## Step 8 — Trigger the first staging deploy

1. Create a feature branch:
   ```bash
   git checkout -b feature/test-staging
   ```
2. Make any small change (e.g. add a comment to a file)
3. Push the branch:
   ```bash
   git push origin feature/test-staging
   ```
4. Open a PR against `main`

Within a few minutes, you should see:
- A **PR comment** with the staging URL
- **PR checks** showing E2E test results
- The staging site live at `https://staging.trailgliders.com.ng`

---

## Step 9 — Seed the staging database (first time only)

The first staging deploy will push the schema but the database will be empty. You need to seed it once:

### Option A: Via cPanel Terminal

```bash
ssh YOURUSER@YOURHOST
cd ~/trailgliders-staging

# Set the staging DATABASE_URL (or source it from the app's env)
export DATABASE_URL="postgresql://..."  # your staging DB URL

# Push schema
npx prisma db push

# Seed
npx tsx scripts/seed.ts --force
npx tsx scripts/seed-slides.ts
npx tsx scripts/migrate-security.ts
npx tsx scripts/backfill-slugs.ts
```

### Option B: Via Prisma Studio (GUI)

If your host allows it, run Prisma Studio connected to the staging DB and add a few records manually:
```bash
npx prisma studio
```

Open `http://localhost:5555`, add site settings + at least one program/faculty/news item.

---

## How to use staging

### For each feature branch

1. Push your branch → staging auto-deploys
2. Visit `https://staging.trailgliders.com.ng` → test your changes in the browser
3. Check the PR checks → E2E tests should be green
4. If everything looks good → merge the PR
5. Merging to `main` triggers the **production** deploy via `deploy.yml`

### What's safe to test on staging

- ✅ UI changes (CSS, layout, content)
- ✅ New pages or routes
- ✅ Admin panel changes
- ✅ Database schema migrations (the staging DB is separate)
- ✅ New API endpoints
- ✅ i18n translations

### What's NOT safe (even on staging)

- ❌ Don't run destructive scripts like `prisma migrate reset` — they'll wipe the staging DB
- ❌ Don't point staging at the production database
- ❌ Don't share staging admin credentials publicly (it's a live URL)

---

## Troubleshooting

### Staging site shows "503 Service Unavailable"

- Check cPanel → Setup Node.js App → click **Restart** on the staging app
- Verify `server.js` exists in `~/trailgliders-staging/` (the deploy should have put it there)
- Check the staging app's environment variables — `DATABASE_URL` must be set

### E2E tests fail with "connection refused"

The Next.js server didn't start in time. Check the `server-logs` artifact in the Actions run for errors. Common causes:
- Missing env vars (the workflow sets placeholders — make sure they're valid)
- Build failed silently (check the build step's output)
- Prisma client wasn't generated (the workflow runs `prisma generate` before building)

### Staging deploy skipped with "STAGING_ENABLED != 'true'"

You haven't set the `STAGING_ENABLED` variable. See Step 7 above.

### PR comment not appearing

The workflow needs the `pull-requests: write` permission (already set in the workflow). If you're in an organization, check that GitHub Actions has permission to comment on PRs:
- Settings → Actions → General → Workflow permissions → **Read and write permissions**

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

### Database connection errors in E2E

The E2E workflow uses a Postgres service container. If you see "ECONNREFUSED 127.0.0.1:5432":
- The service container didn't start (check the "Wait for PostgreSQL" step output)
- Try re-running the workflow (sometimes the container is slow to start)

---

## Cost impact

Each PR run uses approximately:
- **E2E workflow**: ~5-7 minutes (build + Postgres + Playwright)
- **Staging workflow**: ~3-5 minutes (build + rsync + post-deploy)

GitHub free tier: 2,000 minutes/month for private repos.
That's ~200-400 PR runs per month — plenty for a school site.

Public repos: unlimited free minutes.

---

## Disabling staging

If you want to temporarily disable staging deploys (e.g. to save CI minutes):

1. Go to **Settings → Secrets and variables → Actions → Variables**
2. Find `STAGING_ENABLED`
3. Either delete it, or change its value to `false`

The staging workflow will still build (verifying the code compiles) but skip the deploy step. E2E tests still run.

To completely disable the staging workflow, rename `.github/workflows/staging.yml` to `.github/workflows/staging.yml.disabled`.

---

## Files added/modified

| File | Purpose |
|---|---|
| `.github/workflows/e2e.yml` | E2E test pipeline (Playwright + Postgres service container) |
| `.github/workflows/staging.yml` | Staging deploy pipeline (rsync to cPanel staging subdomain) |
| `playwright.config.ts` | Playwright configuration (browsers, reporters, timeouts) |
| `e2e/smoke.spec.ts` | Smoke tests — homepage, listing pages, detail pages, 404s |
| `e2e/admin.spec.ts` | Admin tests — login, dashboard, CRUD, security |
| `e2e/i18n.spec.ts` | i18n tests — locale routing, language switcher, hreflang |
| `package.json` | Added `@playwright/test` devDependency + `e2e:*` scripts |
| `docs/STAGING-SETUP.md` | This guide |

---

## Quick reference

```bash
# Run E2E tests locally (requires running Postgres + seeded DB)
npm run e2e:install    # one-time: installs Playwright browsers
npm run e2e            # runs all tests

# Open interactive Playwright UI
npm run e2e:ui

# View last test report
npm run e2e:report

# Manually trigger staging deploy
# Actions → Deploy to Staging → Run workflow
```
