# Deploying Trail Gliders Academy on cPanel

This guide walks you through deploying the Trail Gliders Academy Next.js app on **shared cPanel hosting with Node.js support** (Namecheap, HostGator, Bluehost Nigeria, etc.).

---

## Prerequisites

- cPanel hosting with **"Setup Node.js App"** feature (under Software section)
- Node.js 18+ available in cPanel's Node selector
- SSH/Terminal access (optional but recommended — cPanel → Terminal)
- Your domain pointed at the cPanel account (e.g. `trailgliders.edu.ng`)

---

## Step 1 — Upload the project

### Option A: Via Git (recommended)

1. In cPanel, open **Git Version Control** (under Files)
2. Click **Create** and clone your project repo into `~/trailgliders`
3. Or push from local: `git push origin main` after adding cPanel as a remote

### Option B: Via File Manager

1. Zip your project locally (exclude `node_modules`, `.next`, `db/*.db`)
2. In cPanel → **File Manager** → upload the zip to `public_html/` (or a subfolder)
3. Extract to a folder like `~/trailgliders`

**⚠️ Important**: NEVER put the project inside `public_html` directly — Node.js apps should live in your home directory (e.g. `~/trailgliders`), with only static files (if any) in `public_html`. cPanel's Node app server will handle routing.

---

## Step 2 — Set up the Node.js app

1. In cPanel, open **Software → Setup Node.js App**
2. Click **Create Application**
3. Fill in:
   - **Node.js version**: 18.x or 20.x (highest available)
   - **Application mode**: Production
   - **Application root**: `trailgliders` (the folder you uploaded to)
   - **Application URL**: your domain (e.g. `trailgliders.edu.ng`)
   - **Application startup file**: `server.js` (after build — see below)
4. Click **Create**

---

## Step 3 — Set environment variables (CRITICAL)

This is the most important step. In the Node.js app settings, find the **Environment variables** section and add the following:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `file:/home/USERNAME/trailgliders/db/custom.db` | Replace `USERNAME` with your cPanel username |
| `NEXTAUTH_SECRET` | (generate — see below) | Random 32+ char string |
| `NEXTAUTH_URL` | `https://trailgliders.edu.ng` | Your production URL |
| `SECRETS_MASTER_KEY` | (generate — see below) | Random 32+ char string — used to encrypt SMTP/payment secrets |
| `NODE_ENV` | `production` | |

**Generate strong secrets in cPanel Terminal:**
```bash
openssl rand -base64 32    # for NEXTAUTH_SECRET
openssl rand -base64 48    # for SECRETS_MASTER_KEY
```

⚠️ **NEVER commit `.env` to git.** The `.env` file in this project is for local development only. On cPanel, env vars must be set via the cPanel UI.

---

## Step 4 — Install dependencies and build

Open cPanel **Terminal** (or use SSH) and run:

```bash
cd ~/trailgliders

# Install dependencies (use whichever is available)
bun install   # or: npm install

# Build for production
bun run build   # or: npm run build

# Push database schema (creates the SQLite DB)
bun run db:push   # or: npm run db:push

# Seed the database with default admin + site content
bun run db:seed   # or: npm run db:seed

# Seed hero slides
bun run seed:slides   # or: npm run seed:slides

# Run security migration (ensures admin role + policy)
bun run migrate:security   # or: npm run migrate:security
```

**If `bun` is not available in cPanel**, use npm:
```bash
npm install
npm run build
npm run db:push
npm run db:seed
npm run seed:slides
npm run migrate:security
```

Or use the universal runner (auto-detects bun or npm):
```bash
./run.sh install
./run.sh build
./run.sh db:push
./run.sh db:seed
./run.sh seed:slides
./run.sh migrate:security
```

---

## Step 5 — Restart the app

In cPanel → **Setup Node.js App** → find your app → click **Restart**.

Visit `https://trailgliders.edu.ng` to confirm the site loads.

---

## Step 6 — Change the default admin password

1. Visit `https://trailgliders.edu.ng/admin/login`
2. Sign in with: `admin@trailgliders.edu.ng` / `TrailGliders2026!`
3. Go to **Settings → Security tab**
4. Change the password to a strong one (12+ chars with upper/lower/digit/symbol)

---

## Step 7 — Configure SMTP for the contact form

The contact form will silently log submissions until SMTP is configured. To make it actually send email:

1. Sign in to admin → **Secrets Vault**
2. Click **Add from Template** → **SMTP Credentials**
3. Add these 5 secrets one by one:
   - `SMTP_HOST` — e.g. `smtp.gmail.com`, `mail.trailgliders.edu.ng`
   - `SMTP_PORT` — `587` (TLS) or `465` (SSL)
   - `SMTP_USER` — your email username
   - `SMTP_PASSWORD` — your email password (use an app-specific password for Gmail)
   - `SMTP_FROM` — e.g. `info@trailgliders.edu.ng`
4. Each secret is encrypted with `SECRETS_MASTER_KEY` before storage
5. Test the contact form — submissions should now arrive in your inbox

**Common SMTP providers in Nigeria:**
- **Gmail** (free, ~100 emails/day): `smtp.gmail.com:587`, use an App Password
- **Zoho Mail** (free custom domain): `smtp.zoho.com:465`
- **Your cPanel email**: `mail.yourdomain.com:465` — use the email account you created in cPanel
- **SendGrid** (paid, scalable): `smtp.sendgrid.net:587`, username `apikey`

---

## Step 8 — Optional: Configure Paystack for fee payments

1. Sign in to admin → **Secrets Vault**
2. Click **Add from Template** → **Paystack Payment Keys**
3. Add:
   - `PAYSTACK_PUBLIC_KEY` — `pk_test_...` or `pk_live_...`
   - `PAYSTACK_SECRET_KEY` — `sk_test_...` or `sk_live_...`
   - `PAYSTACK_WEBHOOK_SECRET` — from Paystack dashboard → Settings → API Keys & Webhooks

Get these from https://dashboard.paystack.com → Settings → API Keys & Webhooks.

---

## Step 9 — Set up SSL (HTTPS)

1. cPanel → **SSL/TLS Status** → **Run AutoSSL** for your domain
2. Or use **Let's Encrypt™ SSL** (cPanel → Security section)
3. Verify HTTPS works: `https://trailgliders.edu.ng` should load without warnings
4. The app forces HTTPS via HSTS headers automatically

---

## Step 10 — Set up automatic backups

The SQLite database lives at `~/trailgliders/db/custom.db`. To back up:

### Manual backup (one-time)
```bash
cp ~/trailgliders/db/custom.db ~/backups/custom-$(date +%Y%m%d).db
```

### Automatic daily backup (cPanel Cron Job)
1. cPanel → **Cron Jobs**
2. Add a job that runs daily at 2 AM:
```
0 2 * * * cp /home/USERNAME/trailgliders/db/custom.db /home/USERNAME/backups/custom-$(date +\%Y\%m\%d).db && find /home/USERNAME/backups/ -mtime +30 -delete
```
This keeps the last 30 days of backups automatically.

---

## Troubleshooting

### App shows "503 Service Unavailable"
- Check cPanel → Setup Node.js App → click **Run NPM Install** if dependencies are missing
- Check the app's log file: cPanel → Setup Node.js App → click **View Logs**

### "Cannot find module 'next'" error
- Run `npm install` or `bun install` in the project folder via Terminal
- Then restart the app in cPanel

### Database errors
- Verify `DATABASE_URL` points to a writable path inside your home directory
- Run `npm run db:push` (or `bun run db:push`) to recreate the schema
- Run `npm run db:seed` (or `bun run db:seed`) to repopulate default content

### Admin login doesn't work
- Run `npm run db:seed` (or `bun run db:seed`) again to recreate the admin user
- Default credentials: `admin@trailgliders.edu.ng` / `TrailGliders2026!`

### SMTP not sending
- Check the secrets are set in **Secrets Vault** (not just `.env`)
- Check cPanel → **Email → Track Delivery** for delivery attempts
- Contact form submissions are always audit-logged (visible on admin Dashboard) even if SMTP fails

### Account lockout
- After 5 failed admin logins, the account is locked for 15 minutes
- To unlock immediately: open cPanel Terminal →
  ```bash
  cd ~/trailgliders && npx prisma studio
  ```
  Open the User table, set `failedAttempts` to 0 and `lockedUntil` to NULL

---

## Security checklist for production

- [ ] `.env` is NOT in git (check `.gitignore`)
- [ ] `NEXTAUTH_SECRET` and `SECRETS_MASTER_KEY` are set via cPanel env vars (not in any file)
- [ ] Default admin password has been changed
- [ ] SSL/HTTPS is active
- [ ] Daily DB backups are configured via cPanel Cron Job
- [ ] cPanel account has 2FA enabled
- [ ] SMTP password is stored only in the Secrets Vault (not `.env`)
- [ ] Payment gateway keys are stored only in the Secrets Vault
- [ ] Admin URL is not publicly linked (only share `https://trailgliders.edu.ng/admin/login` with trusted staff)

---

## Updating the site after deployment

To pull new code changes:

```bash
cd ~/trailgliders
git pull origin main
bun install   # or: npm install (if package.json changed)
bun run build   # or: npm run build
```

Then restart the app in cPanel → Setup Node.js App → Restart.

Database migrations (if schema changed): `bun run db:push` (or `npm run db:push`)

Or use the universal runner:
```bash
./run.sh install
./run.sh build
./run.sh db:push
```

---

## File locations on cPanel

| What | Path |
|---|---|
| Project root | `~/trailgliders/` |
| Database | `~/trailgliders/db/custom.db` |
| Backups | `~/backups/` (create this folder) |
| App logs | cPanel → Setup Node.js App → View Logs |
| Audit logs | In the database → `AuditLog` table (visible on admin dashboard) |

---

Need help? Email the developer who set this up. For security issues, change the `SECRETS_MASTER_KEY` immediately and rotate all stored secrets.
