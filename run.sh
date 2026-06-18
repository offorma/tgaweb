#!/usr/bin/env bash
#
# run.sh — Universal package manager wrapper for Trail Gliders Academy.
# Detects whether bun or npm is available and runs the appropriate command.
#
# Usage:
#   ./run.sh pglite       → start embedded PostgreSQL server (local dev only)
#   ./run.sh dev          → start dev server
#   ./run.sh build        → production build
#   ./run.sh start        → start production server (node)
#   ./run.sh lint         → run eslint
#   ./run.sh db:push      → push prisma schema
#   ./run.sh db:seed      → seed database
#   ./run.sh seed:slides  → seed hero slides
#   ./run.sh install      → install dependencies
#   ./run.sh <any-script> → run any package.json script
#
# If both bun and npm are available, bun is preferred (faster).
# Override with: PM=npm ./run.sh dev

set -euo pipefail

detect_pm() {
  if [ -n "${PM:-}" ]; then
    echo "$PM"
    return
  fi
  if command -v bun &>/dev/null; then
    echo "bun"
  elif command -v npm &>/dev/null; then
    echo "npm"
  else
    echo "none"
  fi
}

PM=$(detect_pm)

if [ "$PM" = "none" ]; then
  echo "❌ Neither bun nor npm found. Install one of:"
  echo "   bun:  curl -fsSL https://bun.sh/install | bash"
  echo "   npm:  comes with Node.js — https://nodejs.org"
  exit 1
fi

run_script() {
  local script="$1"
  shift

  case "$script" in
    install)
      if [ "$PM" = "bun" ]; then
        echo "📦 Installing dependencies with bun..."
        bun install "$@"
      else
        echo "📦 Installing dependencies with npm..."
        npm install "$@"
      fi
      ;;
    db:seed)
      if [ "$PM" = "bun" ]; then
        bun run scripts/seed.ts "$@"
      else
        npx tsx scripts/seed.ts "$@"
      fi
      ;;
    seed:slides)
      if [ "$PM" = "bun" ]; then
        bun run scripts/seed-slides.ts "$@"
      else
        npx tsx scripts/seed-slides.ts "$@"
      fi
      ;;
    migrate:security)
      if [ "$PM" = "bun" ]; then
        bun run scripts/migrate-security.ts "$@"
      else
        npx tsx scripts/migrate-security.ts "$@"
      fi
      ;;
    test:2fa)
      if [ "$PM" = "bun" ]; then
        bun run scripts/test-2fa.ts "$@"
      else
        npx tsx scripts/test-2fa.ts "$@"
      fi
      ;;
    *)
      if [ "$PM" = "bun" ]; then
        bun run "$script" "$@"
      else
        npm run "$script" -- "$@"
      fi
      ;;
  esac
}

if [ $# -eq 0 ]; then
  echo "Trail Gliders Academy — Universal Runner"
  echo ""
  echo "Detected package manager: $PM"
  echo ""
  echo "Usage: ./run.sh <command> [args...]"
  echo ""
  echo "Commands:"
  echo "  install        Install dependencies"
  echo "  dev            Start dev server (port 3000)"
  echo "  build          Production build"
  echo "  start          Start production server (node)"
  echo "  start:bun      Start production server (bun)"
  echo "  lint           Run eslint"
  echo "  db:push        Push prisma schema to DB"
  echo "  db:generate    Generate prisma client"
  echo "  db:seed        Seed database with default content"
  echo "  seed:slides    Seed hero slides"
  echo "  migrate:security  Run security migration"
  echo "  test:2fa       Run 2FA end-to-end tests"
  echo ""
  echo "Override package manager: PM=npm ./run.sh dev"
  exit 0
fi

SCRIPT="$1"
shift

echo "▶ Running '$SCRIPT' with $PM..."
run_script "$SCRIPT" "$@"
