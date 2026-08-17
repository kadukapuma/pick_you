#!/usr/bin/env bash
# Promote the admin frontend from the current source to picku.lk (LIVE).
#
# Runs LOCALLY (Git Bash), not on the server - Vite bakes VITE_API_BASE_URL /
# VITE_WS_HOST into the JS bundle at build time, and there's no Node on the
# server, so the production bundle must be built here (using .env.production,
# which already points at picku.lk) and then shipped over.
#
# Requires PuTTY's plink/pscp on PATH, and SSH connection details via env vars
# (never hardcode the password in this file):
#   PICKU_SSH_HOST      default 159.198.75.110
#   PICKU_SSH_PORT      default 22
#   PICKU_SSH_USER      default root
#   PICKU_SSH_PASSWORD  required
#
# Usage (run from frontend-admin/):
#   deploy/promote-frontend.sh            Build only. Verifies the bundle points at
#                                          picku.lk (not test.picku.lk) and stops -
#                                          nothing is uploaded.
#   deploy/promote-frontend.sh --apply    Build, then back up live's current frontend,
#                                          upload, and deploy the new build.

set -euo pipefail

HOST="${PICKU_SSH_HOST:-159.198.75.110}"
PORT="${PICKU_SSH_PORT:-22}"
USER="${PICKU_SSH_USER:-root}"
PASS="${PICKU_SSH_PASSWORD:-}"

PLINK="/c/Program Files/PuTTY/plink.exe"
PSCP="/c/Program Files/PuTTY/pscp.exe"

mode="${1:-}"

if [ "$mode" = "--apply" ] && [ -z "$PASS" ]; then
    echo "PICKU_SSH_PASSWORD is not set. Example:"
    echo "  PICKU_SSH_PASSWORD='...' deploy/promote-frontend.sh --apply"
    exit 1
fi

echo "=== Building for production (vite build, .env.production -> picku.lk) ==="
rm -rf dist-promote
npx vite build --outDir dist-promote

echo "=== Verifying the bundle targets picku.lk, not test.picku.lk ==="
if grep -rl 'test\.picku\.lk' dist-promote/assets/*.js >/dev/null 2>&1; then
    echo "REFUSING TO CONTINUE: test.picku.lk found baked into the build."
    exit 1
fi
if ! grep -rl 'https://picku\.lk/api' dist-promote/assets/*.js >/dev/null 2>&1; then
    echo "REFUSING TO CONTINUE: could not confirm https://picku.lk/api in the build."
    exit 1
fi
echo "OK - bundle correctly targets picku.lk"

if [ "$mode" != "--apply" ]; then
    echo
    echo "Dry run only (build + verify). Re-run with --apply to deploy to picku.lk."
    exit 0
fi

echo "=== Packaging build ==="
tar czf dist-promote.tar.gz -C dist-promote .

echo "=== Uploading to server ==="
echo y | "$PSCP" -pw "$PASS" -P "$PORT" dist-promote.tar.gz "$USER@$HOST:/root/dist-promote.tar.gz"

echo "=== Deploying on server (backup live frontend, then swap in new build) ==="
echo y | "$PLINK" -ssh -P "$PORT" -pw "$PASS" "$USER@$HOST" "
set -e
ts=\$(date +%Y%m%d-%H%M%S)
mkdir -p /root/backups/frontend
tar czf /root/backups/frontend/frontend-\$ts.tar.gz -C /var/www frontend
mkdir -p /root/dist-promote-new
tar xzf /root/dist-promote.tar.gz -C /root/dist-promote-new
rm -rf /var/www/frontend/*
cp -a /root/dist-promote-new/. /var/www/frontend/
chown -R apache:apache /var/www/frontend
rm -rf /root/dist-promote-new /root/dist-promote.tar.gz
curl -s -o /dev/null -w 'picku.lk: HTTP %{http_code}\n' https://picku.lk/
"

rm -rf dist-promote dist-promote.tar.gz
echo "Done."
