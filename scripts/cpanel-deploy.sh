#!/usr/bin/env bash
#
# cpanel-deploy.sh — Deploy Trail Gliders Academy to cPanel from your machine.
#
# Usage:
#   ./scripts/cpanel-deploy.sh              # uses .env.deploy for config
#   SKIP_BUILD=true ./scripts/cpanel-deploy.sh  # skip build, redeploy last build
#
# Config via .env.deploy (NOT committed):
#   CPANEL_HOST=131.153.148.82
#   CPANEL_USER=trailgli
#   CPANEL_PATH=/home2/trailgli/prod.trailglidersacademy.com.ng
#   CPANEL_APP_NAME=prod.trailglidersacademy.com.ng
#   CPANEL_PORT=22
#   SSH_KEY=~/.ssh/trailgliders-deploy
#   NODE_BIN=/opt/alt/alt-nodejs22/root/usr/bin
#

set -euo pipefail

# ─── Load .env.deploy if present ────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

if [ -f .env.deploy ]; then
  set -a
  source .env.deploy
  set +a
fi

# ─── Validate required env vars ─────────────────────────────────────────────
REQUIRED=(CPANEL_HOST CPANEL_USER CPANEL_PATH)
for var in "${REQUIRED[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "ERROR: $var is not set. Create .env.deploy or pass inline."
    exit 1
  fi
done

CPANEL_PORT="${CPANEL_PORT:-22}"
CPANEL_APP_NAME="${CPANEL_APP_NAME:-}"
SKIP_BUILD="${SKIP_BUILD:-false}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/trailgliders-deploy}"
NODE_BIN="${NODE_BIN:-/opt/alt/alt-nodejs22/root/usr/bin}"

SSH_HOST="${CPANEL_USER}@${CPANEL_HOST}"
SSH_CMD="ssh -i ${SSH_KEY} -p ${CPANEL_PORT} -o ServerAliveInterval=15 -o ServerAliveCountMax=20 ${SSH_HOST}"

# ─── Pre-flight checks ─────────────────────────────────────────────────────
command -v ssh >/dev/null || { echo "ERROR: ssh not installed"; exit 1; }
command -v scp >/dev/null || { echo "ERROR: scp not installed"; exit 1; }
[ -f package.json ] || { echo "ERROR: must run from project root"; exit 1; }
[ -f "$SSH_KEY" ] || { echo "ERROR: SSH key not found at $SSH_KEY"; exit 1; }

echo "──────────────────────────────────────────────────────────────"
echo "  Trail Gliders Academy — cPanel Deploy"
echo "──────────────────────────────────────────────────────────────"
echo "  Host:       $CPANEL_HOST:$CPANEL_PORT"
echo "  User:       $CPANEL_USER"
echo "  App root:   $CPANEL_PATH"
echo "  App name:   ${CPANEL_APP_NAME:-(none — will use restart.txt)}"
echo "  SSH key:    $SSH_KEY"
echo "  Skip build: $SKIP_BUILD"
echo "──────────────────────────────────────────────────────────────"
echo ""

# ─── Step 1: Build ─────────────────────────────────────────────────────────
if [ "$SKIP_BUILD" != "true" ]; then
  echo "─── Step 1/5: Building Next.js ───"
  if command -v bun &>/dev/null && [ -f bun.lock ]; then
    bun install --frozen-lockfile
    bun run build
  else
    npm ci
    npm run build
  fi
  echo "✓ Build complete"
else
  echo "─── Step 1/5: Skipping build ───"
fi

# ─── Step 2: Verify build output ──────────────────────────────────────────
echo ""
echo "─── Step 2/5: Verifying build artifacts ───"
test -f .next/standalone/server.js || { echo "ERROR: .next/standalone/server.js missing"; exit 1; }
test -d .next/static || { echo "ERROR: .next/static missing"; exit 1; }
echo "✓ Standalone server.js present ($(du -sh .next/standalone | cut -f1))"

# ─── Step 3: Test SSH ─────────────────────────────────────────────────────
echo ""
echo "─── Step 3/5: Testing SSH connection ───"
$SSH_CMD "echo '✓ SSH OK'; whoami" || {
  echo "ERROR: SSH connection failed"
  echo "Check: ssh -i $SSH_KEY -p $CPANEL_PORT $SSH_HOST 'whoami'"
  exit 1
}

# ─── Step 4: Create tarball and upload ─────────────────────────────────────
echo ""
echo "─── Step 4/5: Packaging and uploading ───"

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Stage payload
mkdir -p "$TMPDIR/app"
cp -r .next/standalone/. "$TMPDIR/app/"
mkdir -p "$TMPDIR/app/.next"
cp -r .next/static "$TMPDIR/app/.next/static"
cp -r public "$TMPDIR/app/public"
mkdir -p "$TMPDIR/app/prisma"
cp -r prisma/* "$TMPDIR/app/prisma/" 2>/dev/null || true
cp -r scripts "$TMPDIR/app/scripts"
cp package.json "$TMPDIR/app/"
[ -f package-lock.json ] && cp package-lock.json "$TMPDIR/app/"
[ -f bun.lock ] && cp bun.lock "$TMPDIR/app/"
[ -f run.sh ] && cp run.sh "$TMPDIR/app/" && chmod +x "$TMPDIR/app/run.sh"

# Bundle Prisma client + engine binaries (avoids needing prisma CLI on cPanel)
mkdir -p "$TMPDIR/app/node_modules"
cp -r node_modules/@prisma "$TMPDIR/app/node_modules/@prisma"
cp -r node_modules/.prisma "$TMPDIR/app/node_modules/.prisma"
cp -r node_modules/prisma "$TMPDIR/app/node_modules/prisma"
cp -r node_modules/bcryptjs "$TMPDIR/app/node_modules/bcryptjs"

# Create tarball with bundled Prisma (exclude prisma build dir to save space)
tar -czf "$TMPDIR/deploy.tar.gz" \
  --exclude='node_modules/prisma/build' \
  -C "$TMPDIR/app" .
TARBALL_SIZE=$(du -sh "$TMPDIR/deploy.tar.gz" | cut -f1)
echo "✓ Tarball created ($TARBALL_SIZE)"

# Upload
scp -i "$SSH_KEY" -P "$CPANEL_PORT" \
  "$TMPDIR/deploy.tar.gz" \
  "${SSH_HOST}:${CPANEL_PATH}/deploy.tar.gz"
echo "✓ Uploaded to server"

# ─── Step 5: Extract + post-deploy on server ──────────────────────────────
echo ""
echo "─── Step 5/5: Extracting + running post-deploy ───"

COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
VERSION=$(git describe --tags --always --dirty 2>/dev/null || echo "dev-$COMMIT")

$SSH_CMD "
  export PATH=${NODE_BIN}:\$PATH
  cd '${CPANEL_PATH}'

  # Backup current deployment
  if [ -f server.js ]; then
    mkdir -p backups
    TS=\$(date +%Y%m%d-%H%M%S)
    tar -czf backups/rollback-\$TS.tgz server.js package.json .next public 2>/dev/null || true
    ls -t backups/rollback-*.tgz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
    echo \"✓ Backup: rollback-\$TS.tgz\"
  fi

  # Preserve node_modules symlink (cPanel CloudLinux)
  NM_LINK=\"\"
  if [ -L node_modules ]; then
    NM_LINK=\$(readlink node_modules)
  fi

  # Preserve dirs
  mkdir -p /tmp/tga-deploy-\$\$
  for d in backups logs uploads tmp; do
    [ -d \$d ] && mv \$d /tmp/tga-deploy-\$\$/\$d 2>/dev/null || true
  done
  for f in .env .env.local .env.production; do
    [ -f \$f ] && cp \$f /tmp/tga-deploy-\$\$/\$f 2>/dev/null || true
  done

  # Clean old deploy files (preserved dirs are safe in /tmp)
  rm -rf .next node_modules server.js package.json package-lock.json bun.lock run.sh prisma scripts public 2>/dev/null || true

  # Extract
  tar -xzf deploy.tar.gz
  rm -f deploy.tar.gz

  # Restore node_modules symlink
  if [ -n \"\$NM_LINK\" ]; then
    rm -rf node_modules 2>/dev/null || true
    ln -s \"\$NM_LINK\" node_modules
  fi

  # Restore preserved dirs
  for d in backups logs uploads tmp; do
    [ -d /tmp/tga-deploy-\$\$/\$d ] && mv /tmp/tga-deploy-\$\$/\$d . 2>/dev/null || true
  done
  for f in .env .env.local .env.production; do
    [ -f /tmp/tga-deploy-\$\$/\$f ] && mv /tmp/tga-deploy-\$\$/\$f . 2>/dev/null || true
  done
  rm -rf /tmp/tga-deploy-\$\$

  echo '✓ Extracted'

  # Push database schema (sync tables with Prisma schema)
  if [ -f .env ]; then
    set -a; source .env; set +a
  fi
  if [ -n \"\${DATABASE_URL:-}\" ]; then
    echo 'Pushing database schema...'
    npx prisma db push --accept-data-loss --skip-generate
    echo '✓ Database schema pushed'
  else
    echo '⚠ DATABASE_URL not set — skipping schema push'
  fi

  # Run post-deploy
  chmod +x scripts/cpanel-post-deploy.sh
  cp scripts/cpanel-post-deploy.sh post-deploy.sh
  chmod +x post-deploy.sh
  ./post-deploy.sh \
    --app-name '${CPANEL_APP_NAME}' \
    --commit '${COMMIT}' \
    --version '${VERSION}'
"

echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✓ DEPLOYMENT COMPLETE"
echo "  Commit:  $COMMIT"
echo "  Version: $VERSION"
echo ""
echo "  Verify:  Visit your site"
echo "  Rollback: $SSH_CMD \\"
echo "    'cd $CPANEL_PATH && tar -xzf backups/rollback-<TS>.tgz && touch tmp/restart.txt'"
echo "════════════════════════════════════════════════════════"
