#!/usr/bin/env bash
# Promote the Laravel backend from test-backend (test.picku.lk) to backend (picku.lk, LIVE).
#
# Runs ON THE SERVER (not locally) - both directories already live there.
#
# Usage:
#   ./promote-backend.sh              Dry run only. Shows exactly what would change and
#                                      which migrations are pending. Touches nothing.
#   ./promote-backend.sh --apply      Backs up live, syncs code, composer install,
#                                      clears caches, restarts workers. Does NOT run
#                                      migrations - always a separate, explicit step.
#   ./promote-backend.sh --migrate    Runs pending migrations against the LIVE database.
#                                      Run this only after reviewing --apply's pretend output.
#
# Never touches: live .env, live storage/ (logs + real user uploads), live database
# rows (only schema, and only via --migrate). test-backend is only ever read from.

set -euo pipefail

SRC=/var/www/test-backend
DST=/var/www/backend
BACKUP_DIR=/root/backups/backend
EXCLUDES=(--exclude='.env' --exclude='.env.*' --exclude='storage/' --exclude='vendor/' --exclude='bootstrap/cache/')

mode="${1:-}"

dry_run_preview() {
    echo "=== Code changes that would be applied (test-backend -> backend) ==="
    rsync -ani --delete "${EXCLUDES[@]}" "$SRC/" "$DST/"
    echo
    echo "=== Pending migrations against LIVE database ==="
    # --force bypasses Laravel's "are you sure, this is production" prompt;
    # --pretend itself is read-only so this is safe to force non-interactively.
    (cd "$DST" && php artisan migrate --pretend --force)
}

apply() {
    ts=$(date +%Y%m%d-%H%M%S)
    mkdir -p "$BACKUP_DIR"
    echo "=== Backing up current live backend to $BACKUP_DIR/backend-$ts.tar.gz ==="
    tar --exclude='backend/vendor' --exclude='backend/storage' -czf "$BACKUP_DIR/backend-$ts.tar.gz" -C /var/www backend

    echo "=== Syncing code: test-backend -> backend ==="
    rsync -a --delete "${EXCLUDES[@]}" "$SRC/" "$DST/"

    echo "=== composer install (production, no-dev) ==="
    (cd "$DST" && composer install --no-dev --optimize-autoloader)

    echo "=== Clearing caches ==="
    (cd "$DST" && php artisan config:clear && php artisan route:clear && php artisan cache:clear)

    echo "=== Pending migrations (NOT applied yet - review, then run: $0 --migrate) ==="
    (cd "$DST" && php artisan migrate --pretend --force)

    echo "=== Restarting live queue workers + reverb (brief websocket blip for connected users) ==="
    supervisorctl restart laravel-workers:* reverb

    echo "=== Smoke test ==="
    curl -s -o /dev/null -w 'picku.lk: HTTP %{http_code}\n' https://picku.lk/
    tail -n 20 "$DST/storage/logs/laravel.log" 2>/dev/null || true

    echo
    echo "Done. If migrations are pending above, review them, then run: $0 --migrate"
}

migrate() {
    echo "=== Running pending migrations against LIVE database ==="
    (cd "$DST" && php artisan migrate --force)
}

case "$mode" in
    "")
        dry_run_preview
        ;;
    --apply)
        apply
        ;;
    --migrate)
        migrate
        ;;
    *)
        echo "Unknown option: $mode"
        echo "Usage: $0 [--apply|--migrate]"
        exit 1
        ;;
esac
