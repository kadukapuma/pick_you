Repository root notes

This repository is organized as a monorepo containing multiple applications and a backend service.

- `backend-api/` — Laravel backend (moved scripts live in `backend-api/scripts/`).
- `DriverApp/`, `PassengerApp/`, `frontend-admin/` — client applications (mobile/web).

Notes and recommended next steps:
- Root `package.json` and `package-lock.json` are present but minimal. Confirm whether they are used for cross-project dev scripts. If not, move them into the specific app that needs them or remove them.
- If a root `node_modules/` exists, remove it and run `npm install` within each app (DriverApp, PassengerApp, frontend-admin) to avoid a large shared node_modules.
- If you want, I can move the root `package.json` to a chosen app and delete the root `node_modules`.
