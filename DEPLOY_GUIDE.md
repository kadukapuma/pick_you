# Deploy Guide: test.picku.lk → picku.lk

How to move code you've tested on `test.picku.lk` onto the live `picku.lk` site,
using the two scripts in this repo. Read the **Safety model** section once —
after that this is meant to be a quick reference.

## Server & directory map

| | Live (`picku.lk`) | Test (`test.picku.lk`) |
|---|---|---|
| Backend (Laravel) | `/var/www/backend` | `/var/www/test-backend` |
| Frontend (admin panel) | `/var/www/frontend` | `/var/www/test-frontend/dist` |
| Database | `pick_you` | `pick_you_prod` |
| Queue worker (supervisor) | `laravel-workers:*`, `reverb` | `picku-production-worker:*` |

Server: `159.198.75.110`, port `22`, user `root`. Password isn't written here on
purpose — keep it out of anything that might get committed. Connect with:

```
ssh root@159.198.75.110
```

(Windows 10 has an OpenSSH client built in, so plain `ssh` works from PowerShell
or Git Bash — you'll just get an interactive password prompt.)

## Safety model — read this once

- **Backend promotion copies files test → live.** Whatever is sitting in
  `/var/www/test-backend` on the server is exactly what gets copied to
  `/var/www/backend` when you `--apply`. It never reads from your local machine.
- **Frontend promotion rebuilds from your local source instead of copying test's
  build.** Vite bakes the API URL into the JS at build time, so the script
  always does a fresh `vite build` locally with production settings, rather than
  reusing whatever's on `test.picku.lk`. See the note at the bottom about what
  this means for your edit → test → promote flow.
- Neither script ever touches: live's `.env`, live's `storage/` (real logs +
  user uploads), or live's database rows — except migrations, which are always
  a separate, explicit step you run yourself.
- Both scripts back up the live side before changing anything.
- Both default to a **dry run** — you have to pass `--apply` to actually change
  live.

## 1. Promoting the backend

The script lives **on the server** at `/root/scripts/promote-backend.sh`
(source of truth is `backend-api/deploy/promote-backend.sh` in this repo — if
you edit it, re-upload it with `pscp`).

**Step 1 — get your change onto test.** Same as you do today: edit locally,
copy/upload the changed files into `/var/www/test-backend`, verify on
`https://test.picku.lk`.

**Step 2 — SSH in and preview.**

```
ssh root@159.198.75.110
/root/scripts/promote-backend.sh
```

This only prints what *would* change (an `rsync --dry-run` style diff) and any
pending database migrations. Nothing is touched. Read it before continuing.

**Step 3 — apply.**

```
/root/scripts/promote-backend.sh --apply
```

This, in order:
1. Backs up current live backend to `/root/backups/backend/backend-<timestamp>.tar.gz`
2. Copies test-backend → backend (excluding `.env`, `.env.*`, `storage/`,
   `vendor/`, `bootstrap/cache/` — those always stay live's own)
3. Runs `composer install --no-dev --optimize-autoloader`
4. Clears Laravel's config/route/cache
5. Restarts `laravel-workers:*` and `reverb` (⚠️ this drops connected users'
   websocket connections for a few seconds — expected, not a bug)
6. Shows pending migrations again and **stops** — it does not run them

**Step 4 — migrate, only if step 3 showed pending migrations.**

```
/root/scripts/promote-backend.sh --migrate
```

This is kept as its own command on purpose, so a schema change to the live
database is never bundled silently into a code deploy.

## 2. Promoting the frontend (admin panel)

This one runs **locally** (Git Bash), from `frontend-admin/deploy/promote-frontend.sh`
— not on the server, because building the frontend needs Node, which isn't
installed on the server, and because the build has to happen with production
settings (`.env.production`, pointing at `picku.lk`).

**Step 1 — dry run (build + safety check only, nothing uploaded).**

```
cd frontend-admin
deploy/promote-frontend.sh
```

This builds the current local source with `.env.production` and checks the
compiled bundle for the right API URL. If `test.picku.lk` shows up anywhere in
the built JS, it refuses to continue — that would mean the live admin panel is
accidentally calling the test backend.

**Step 2 — apply.** Requires the server password as an environment variable
(never hardcoded in the script, so it can't end up committed):

```
PICKU_SSH_PASSWORD='...' deploy/promote-frontend.sh --apply
```

This backs up live's current frontend to `/root/backups/frontend/frontend-<timestamp>.tar.gz`
on the server, then uploads and deploys the new build.

**Important:** this always rebuilds from whatever is currently in your local
`frontend-admin/` folder — it does **not** copy whatever's built on
`test-frontend`. In your normal flow (edit locally → build with `.env.test` →
upload to test → verify → promote) this works out fine, since the promote
script builds from that same local source again. Just make sure any change
you tested actually lives in your local source files, not only hand-edited
directly into files on the server.

## Refreshing test FROM production (when test falls behind)

If production gets updated separately and test drifts behind (this happened
once already), sync it back the other direction. Run on the server:

```bash
rsync -a --delete \
  --exclude='.env' --exclude='.env.*' \
  --exclude='storage/' --exclude='vendor/' --exclude='bootstrap/cache/' \
  /var/www/backend/ /var/www/test-backend/

cd /var/www/test-backend
composer install --no-dev --optimize-autoloader
php artisan migrate:status          # see what's pending on test's own DB
php artisan migrate --force         # test's DB only (pick_you_prod)
php artisan config:clear && php artisan route:clear && php artisan cache:clear
supervisorctl restart picku-production-worker:*
```

There's no script for this direction yet since it's a rarer, one-off situation
— ask if you want one made.

## Rolling back

Every promotion backs up the *previous* live state first. To restore:

```bash
# backend
tar xzf /root/backups/backend/backend-<timestamp>.tar.gz -C /var/www
supervisorctl restart laravel-workers:* reverb

# frontend
tar xzf /root/backups/frontend/frontend-<timestamp>.tar.gz -C /var/www
```

A database migration is not automatically reversible this way — if `--migrate`
already ran and needs undoing, that's `php artisan migrate:rollback`, reviewed
with you first, not part of the file restore.

## Troubleshooting

- **`Command cancelled` when checking migrations** — Laravel prompts for
  confirmation on anything DB-related when `APP_ENV=production`, even
  read-only `--pretend`. The scripts already pass `--force` for this; if you
  run `artisan migrate` commands by hand on either backend, add `--force`.
- **`rsync: command not found`** — already installed on this server
  (`dnf install -y rsync`); shouldn't recur, but if you're setting up a new
  box, install it first.
- **Websocket briefly drops after a backend promotion** — expected, `reverb`
  restarts to pick up new code. Reconnects automatically within seconds.
