#!/usr/bin/env bash
#
# cpanel-post-deploy.sh — Runs on the cPanel server AFTER GitHub Actions has
# synced new build artifacts. Performs:
#
#   1. Installs/updates production dependencies (if missing or outdated)
#   2. Regenerates Prisma client (matches the schema just deployed)
#   3. Pushes the Prisma schema to the live SQLite/PostgreSQL database
#   4. Restarts the cPanel Node.js application (via .restart file or UAPI)
#   5. Records deploy info to logs/deploy-history.log
#
# Usage:
#   ./post-deploy.sh --app-name trailgliders --commit abc1234 --version v1.2.3
#
# This script is idempotent — safe to run multiple times.
# It must work on shared cPanel hosts with restricted shell (jailshell).
#
set -euo pipefail

# ─── Defaults ───────────────────────────────────────────────────────────────
APP_NAME=""
COMMIT=""
VERSION=""
DRY_RUN=false

# ─── Parse args ─────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-name)  APP_NAME="$2"; shift 2 ;;
    --commit)    COMMIT="$2"; shift 2 ;;
    --version)   VERSION="$2"; shift 2 ;;
    --dry-run)   DRY_RUN=true; shift ;;
    -h|--help)
      echo "Usage: $0 --app-name NAME --commit SHA --version VER [--dry-run]"
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

# ─── Pre-flight ─────────────────────────────────────────────────────────────
APP_ROOT="$(pwd)"
LOG_DIR="$APP_ROOT/logs"
LOG_FILE="$LOG_DIR/deploy-history.log"
DB_DIR="$APP_ROOT/db"

mkdir -p "$LOG_DIR" "$DB_DIR" "$APP_ROOT/backups"

log()  { echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] $*"; }
err()  { echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] ERROR: $*" >&2; }
step() { echo ""; echo "─── $* ───"; }

log "post-deploy.sh starting"
log "  app_root: $APP_ROOT"
log "  app_name: $APP_NAME"
log "  commit:   $COMMIT"
log "  version:  $VERSION"
log "  user:     $(whoami)"
log "  host:     $(hostname -f 2>/dev/null || hostname)"

if [ ! -f "$APP_ROOT/server.js" ]; then
  err "server.js not found in $APP_ROOT — did rsync succeed?"
  exit 1
fi

if [ ! -f "$APP_ROOT/package.json" ]; then
  err "package.json not found in $APP_ROOT"
  exit 1
fi

# ─── Load .env file (written by GitHub Actions from secrets) ────────────────
# cPanel's "Setup Node.js App → Environment variables" UI only injects vars
# into the Passenger-managed Node process — NOT into SSH sessions. So we
# source the .env file here to make DATABASE_URL etc. available to prisma.
if [ -f "$APP_ROOT/.env" ]; then
  log "Loading .env file"
  set -a
  # shellcheck disable=SC1091
  source "$APP_ROOT/.env"
  set +a
else
  err ".env file not found at $APP_ROOT/.env"
  err "The deploy workflow should have created it from GitHub Secrets."
  err "Required secrets: PROD_DATABASE_URL, PROD_NEXTAUTH_SECRET, PROD_NEXTAUTH_URL, PROD_SECRETS_MASTER_KEY"
  err "Continuing, but prisma db push will likely fail."
fi

# Verify DATABASE_URL is set before proceeding with DB operations
if [ -z "${DATABASE_URL:-}" ]; then
  err "DATABASE_URL is not set — prisma commands will fail"
  err "Check that .env exists and contains DATABASE_URL"
else
  log "DATABASE_URL is set (length: ${#DATABASE_URL})"
  # Show the scheme + host (not the password) for debugging
  case "$DATABASE_URL" in
    postgresql://*|postgres://*) log "  scheme: postgresql ✓" ;;
    file://*) err "  DATABASE_URL uses SQLite (file://) but schema expects postgresql" ;;
    *) err "  DATABASE_URL has unexpected format: ${DATABASE_URL:0:20}..." ;;
  esac
fi

# ─── Ensure Node is in PATH (cPanel keeps it in nodevenv) ─────────────────
# Try common cPanel Node locations if node isn't already in PATH
if ! command -v node &>/dev/null; then
  for candidate in \
    "$HOME/nodevenv/"*/*/bin \
    /opt/alt/alt-nodejs*/root/usr/bin \
    /opt/cpanel/ea-nodejs*/bin; do
    if [ -x "$candidate/node" ]; then
      export PATH="$candidate:$PATH"
      log "Added $candidate to PATH"
      break
    fi
  done
fi

if ! command -v node &>/dev/null; then
  err "node not found in PATH — check cPanel Setup Node.js App"
  exit 3
fi

NODE_VER="$(node -v | sed 's/v//')"
log "node: $NODE_VER ($(which node))"
major="${NODE_VER%%.*}"
if [ "$major" -lt 18 ]; then
  err "Node $NODE_VER too old — needs 18+. Update via cPanel → Setup Node.js App"
  exit 4
fi

# ─── Detect package manager ────────────────────────────────────────────────
PM=""
if command -v bun &>/dev/null && [ -f "$APP_ROOT/bun.lock" ]; then
  PM="bun"
elif command -v npm &>/dev/null; then
  PM="npm"
elif command -v yarn &>/dev/null; then
  PM="yarn"
else
  err "No package manager (npm/bun/yarn) found in PATH"
  exit 3
fi
log "package manager: $PM ($(which $PM))"

# ─── STEP 1: Install production dependencies ───────────────────────────────
step "1/5  Installing production dependencies"
# cPanel's CloudLinux NodeJS Selector manages node_modules as a symlink to
# the nodevenv virtual environment. We must use npm install through cPanel's
# system — never ship a real node_modules directory in the deploy tarball.
log "  running $PM install (production only)..."
if [ "$PM" = "bun" ]; then
  bun install --production --frozen-lockfile 2>&1 | tail -20 || \
  bun install --production 2>&1 | tail -20
elif [ "$PM" = "yarn" ]; then
  yarn install --production --frozen-lockfile 2>&1 | tail -20
else
  npm install --production --no-audit --no-fund --legacy-peer-deps 2>&1 | tail -20
fi
log "  ✓ dependencies installed"

# ─── STEP 2: Generate Prisma client ────────────────────────────────────────
step "2/5  Generating Prisma client"
if [ -f "$APP_ROOT/prisma/schema.prisma" ]; then
  if [ "$DRY_RUN" = false ]; then
    ./node_modules/.bin/prisma generate 2>&1 | tail -10
    log "  ✓ Prisma client generated"
  else
    log "  (dry-run — skipping)"
  fi
else
  log "  ! no prisma/schema.prisma — skipping"
fi

# ─── STEP 3: Push database schema ──────────────────────────────────────────
step "3/5  Pushing database schema (idempotent)"
# This is safe to run repeatedly — Prisma only adds missing tables/columns.
# It does NOT drop data unless the schema change requires it.
if [ -f "$APP_ROOT/prisma/schema.prisma" ]; then
  if [ "$DRY_RUN" = false ]; then
    # Use the env var set in cPanel's Node.js app settings
    if ./node_modules/.bin/prisma db push --accept-data-loss --skip-generate 2>&1 | tail -15; then
      log "  ✓ Database schema pushed"
    else
      err "  prisma db push failed — check DATABASE_URL env var"
      err "  Continuing anyway (existing schema may still work)"
    fi
  else
    log "  (dry-run — skipping)"
  fi
else
  log "  ! no prisma schema — skipping"
fi

# ─── STEP 4: Restart the Node.js app ───────────────────────────────────────
step "4/5  Restarting Node.js application"

# Method A: Touch the restart file (works on most cPanel Node setups)
RESTART_FILE="$APP_ROOT/tmp/restart.txt"
mkdir -p "$APP_ROOT/tmp"
touch "$RESTART_FILE"
log "  ✓ Touched $RESTART_FILE (Passenger will restart on next request)"

# Method B: Try cPanel UAPI (more explicit, requires app name)
if [ -n "$APP_NAME" ] && command -v uapi &>/dev/null; then
  if uapi Nodejs restart_app app_name="$APP_NAME" 2>&1 | tail -5; then
    log "  ✓ UAPI restart_app succeeded"
  else
    log "  ! UAPI restart_app failed (non-fatal) — Passenger will pick up restart.txt"
  fi
fi

# Method C: Try passenger-config (if available)
if command -v passenger-config &>/dev/null 2>&1; then
  passenger-config restart-app "$APP_ROOT" 2>&1 | tail -3 || true
fi

# ─── STEP 5: Record deploy history ─────────────────────────────────────────
step "5/5  Recording deploy history"
HISTORY_LINE="$(date -u +'%Y-%m-%dT%H:%M:%SZ') | commit=${COMMIT:-unknown} | version=${VERSION:-unknown} | user=$(whoami) | host=$(hostname -f 2>/dev/null || hostname)"
echo "$HISTORY_LINE" >> "$LOG_FILE"

# Keep only last 100 entries
tail -100 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"

log ""
log "════════════════════════════════════════════════════════"
log "  ✓ DEPLOYMENT COMPLETE"
log "  Commit: ${COMMIT:-unknown}"
log "  Version: ${VERSION:-unknown}"
log "  App: ${APP_NAME:-(restart via restart.txt)}"
log "  Log: $LOG_FILE"
log "════════════════════════════════════════════════════════"
log ""
log "Next steps:"
log "  1. Visit https://your-domain/ — verify the site loads"
log "  2. Visit https://your-domain/admin/login — verify admin login works"
log "  3. If broken: see rollback instructions in DEPLOYMENT.md"
