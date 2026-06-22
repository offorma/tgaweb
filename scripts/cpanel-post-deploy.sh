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
  log "No .env file found — env vars should be configured in cPanel UI"
  log "(cPanel → Setup Node.js App → Environment Variables)"
  log "Note: cPanel UI env vars are available to the running app via Passenger,"
  log "but NOT in SSH sessions. This is expected."
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

# ─── STEP 1: Verify bundled dependencies ────────────────────────────────────
step "1/5  Verifying bundled dependencies"
# The deploy tarball now bundles node_modules/@prisma, node_modules/.prisma,
# and node_modules/prisma from the GitHub Actions build. This avoids running
# `npm install --production` on cPanel, which was reinstalling a fresh Prisma
# CLI that crashed when trying to download its engine binary.
if [ -d "$APP_ROOT/node_modules/@prisma/client" ]; then
  log "  ✓ Bundled @prisma/client present"
else
  err "  Bundled @prisma/client NOT found in node_modules/"
  err "  The deploy tarball should include node_modules/@prisma — check deploy.yml"
  err "  Continuing, but the app may fail to start."
fi

if [ -d "$APP_ROOT/node_modules/.prisma" ]; then
  log "  ✓ Generated Prisma client present (from CI)"
else
  err "  Generated Prisma client (.prisma) NOT found"
  err "  The deploy tarball should include node_modules/.prisma — check deploy.yml"
fi

# Check if @prisma/client's runtime engine binary is present
ENGINE_BIN=$(find "$APP_ROOT/node_modules/.prisma/client" -name "libquery_engine*" -type f 2>/dev/null | head -1)
if [ -n "$ENGINE_BIN" ]; then
  log "  ✓ Prisma query engine binary: $(basename "$ENGINE_BIN")"
else
  err "  Prisma query engine binary not found in node_modules/.prisma/client/"
  err "  App will crash at runtime — the engine binary must be bundled from CI"
fi

# ─── STEP 2: Prisma client (already generated in CI) ──────────────────────
step "2/5  Verifying Prisma client (generated in CI)"
if [ -f "$APP_ROOT/node_modules/.prisma/client/index.js" ]; then
  log "  ✓ Prisma client present (bundled from GitHub Actions build)"
elif [ -f "$APP_ROOT/node_modules/@prisma/client" ]; then
  log "  ✓ @prisma/client present"
  if [ ! -f "$APP_ROOT/node_modules/.prisma/client/index.js" ]; then
    err "  ⚠ @prisma/client is present but the generated client is missing"
    err "    The deploy tarball should include node_modules/.prisma — check deploy.yml"
  fi
else
  err "  Prisma client not found. The deploy tarball should bundle node_modules/@prisma"
  err "  and node_modules/.prisma (generated during the GitHub Actions build)."
fi

# ─── STEP 3: Database schema (already pushed in CI) ────────────────────────
step "3/5  Database schema (already pushed in CI)"
log "  Schema is pushed from the GitHub Actions runner (not on cPanel)"
log "  This avoids the Prisma CLI crash on cPanel where jailshell blocks"
log "  the engine binary download."
if [ -z "${DATABASE_URL:-}" ]; then
  err "  DATABASE_URL not set in .env — runtime DB queries will fail"
else
  log "  DATABASE_URL is set (length: ${#DATABASE_URL})"
fi

# ─── STEP 3.5: Reap orphaned one-off scripts ───────────────────────────────
# Housekeeping: stray seed/migrate/`node -e` one-liners occasionally hang for
# hours, holding a DB connection and an LVE process slot — which later causes
# `fork: Resource temporarily unavailable` and can starve the app. We reap ONLY
# those long-lived one-off scripts, and NEVER the live Passenger app, systemd,
# or this deploy shell. Best-effort (own user only) — run before the restart so
# the account has process/memory headroom when Passenger respawns.
step "Reaping orphaned one-off scripts (housekeeping)"
ORPHAN_MAX_AGE=1800   # seconds (30 min); legit scripts finish in seconds
MY_PID=$$
reaped=0
while read -r opid oetimes oargs; do
  [ -z "${opid:-}" ] && continue
  [ "$opid" = "$MY_PID" ] && continue
  # NEVER touch the live app, system, ssh, or this deploy process
  case "$oargs" in
    *wrapper-server.js*|*server.js*|*Passenger*|*passenger*|*"systemd --user"*|*sshd*|*post-deploy*|*cpanel-post-deploy*) continue ;;
  esac
  # Only target one-off scripts (node -e one-liners, tsx scripts, seed/migrate)
  case "$oargs" in
    *"node -e "*|*tsx*scripts/*|*scripts/seed*|*scripts/migrate*) : ;;
    *) continue ;;
  esac
  if [ "${oetimes:-0}" -gt "$ORPHAN_MAX_AGE" ]; then
    log "  reaping orphan pid=$opid (${oetimes}s elapsed): ${oargs:0:90}"
    kill "$opid" 2>/dev/null || true        # SIGTERM first (let it clean up)
    sleep 2
    if kill -0 "$opid" 2>/dev/null; then
      kill -9 "$opid" 2>/dev/null || true    # SIGKILL only if it ignored TERM
    fi
    reaped=$((reaped + 1))
  fi
done < <(ps -u "$(id -un)" -o pid=,etimes=,args= 2>/dev/null || true)
log "  ✓ Orphan reap complete (${reaped} reaped)"

# ─── STEP 4: Restart the Node.js app ───────────────────────────────────────
step "4/5  Restarting Node.js application"

# Prisma's library query engine starts background Tokio threads that do NOT
# survive fork(). Passenger's default "smart" spawning preloads the app and then
# forks workers, leaving the forked engine's timer thread gone → every DB query
# panics with "PANIC: timer has gone away" (the app boots but 500s on all data).
# Force direct spawning so each worker boots the engine fresh in its own process.
HTACCESS="$APP_ROOT/.htaccess"
if [ -f "$HTACCESS" ] || touch "$HTACCESS" 2>/dev/null; then
  if ! grep -qi "PassengerSpawnMethod" "$HTACCESS" 2>/dev/null; then
    printf '\n# Prisma engine threads do not survive fork(); start each worker fresh.\nPassengerSpawnMethod direct\nPassengerMaxPreloaderIdleTime 0\n' >> "$HTACCESS"
    log "  ✓ Set 'PassengerSpawnMethod direct' in .htaccess (prevents Prisma fork panic)"
  else
    log "  ✓ PassengerSpawnMethod already set in .htaccess"
  fi
fi

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
