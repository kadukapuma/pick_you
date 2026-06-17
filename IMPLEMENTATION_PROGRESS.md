# Pick You Implementation Progress

This document records completed work from `PLAN.md`, verification results, known constraints, and the next implementation slice.

## Status

- Current phase: Phase 2 - Scalable Live Location and Matching
- Completed slices: 1-10
- Live-location implementation: Code complete; runtime integration testing pending
- Next slice: Live-location runtime integration and real-device verification
- Started: June 12, 2026
- Last updated: June 12, 2026

## Current Summary

The ride security foundation, resource ownership protection, mutation idempotency, and the first complete live-location implementation are now in place across the Laravel backend, DriverApp, and PassengerApp.

Implemented live-location flow:

1. DriverApp publishes validated location samples while the driver is online.
2. Active rides switch to high-accuracy foreground and background tracking.
3. The backend stores the latest location in Redis and maintains the online-driver GEO index.
4. PostgreSQL/PostGIS receives throttled durable snapshots through the `locations` queue.
5. Active-ride updates are broadcast on authorized private `ride.{rideId}` channels.
6. PassengerApp fetches an initial snapshot, receives WebSocket updates, detects stale data, and polls only while WebSocket delivery is unavailable.

The code is implemented and passes available automated checks. Full end-to-end runtime verification is waiting for a Redis instance reachable by Laravel and real-device background-location testing.

## Completed

### Slice 1 - Ride Ownership Authorization and Route Hardening

- Added `RidePolicy` with explicit rules:
  - Passengers can view, cancel, and pay only for their own rides.
  - Assigned drivers can view their ride but cannot cancel it or process its payment.
  - Operators can view rides for support but cannot cancel or process payments.
  - Admins and super admins can view, cancel, and process payments.
- Registered `RidePolicy` explicitly in `AppServiceProvider`.
- Protected `GET /api/rides/{id}` with the ride view policy.
- Protected `DELETE /api/rides/{id}` with the ride cancellation policy.
- Protected `POST /api/payments/{ride_id}` with the payment policy.
- Replaced the broad `driver-locations` API resource with the supported `POST /api/driver-locations` endpoint.
- Added a clear `403` response when a non-driver attempts to publish a location.
- Added unit tests for the ride authorization matrix.

### Slice 2 - Ride Route and Transition Hardening

- Removed unsupported ride `index` and `update` resource routes.
- Added an explicit `RideStateMachine` containing allowed ride transitions.
- Added `RideTransitionService` that locks the ride row and updates the ride and status history in one transaction.
- Moved accept, start, complete, and cancellation updates through the transition service.
- Added retry handling for transaction deadlocks.
- Added unit tests for allowed and rejected ride transitions.

### Slice 3 - Ride Workflow Role Enforcement

- Added reusable `role` middleware that accepts one or more allowed roles.
- Restricted ride creation to passengers.
- Restricted driver ride offers, accept, reject, start, complete, and location publishing to drivers.
- Restricted payment processing to passengers, admins, and super admins; the ride policy still enforces ownership.
- Added unit tests for matching roles, multiple allowed roles, wrong roles, and unauthenticated requests.

### Slice 4 - Private Targeted Ride Offers

- Moved broadcasting authentication to `/api/broadcasting/auth` behind `api` and `auth:sanctum` middleware.
- Changed targeted ride offers from a public channel to `private-driver.rides.{driverId}`.
- Added channel authorization that permits only the authenticated matching driver.
- Added authenticated private-channel support to DriverApp's WebSocket wrapper.
- Changed DriverApp ride-offer subscriptions and cleanup to use the private channel.
- Added a unit test that verifies targeted ride offers use a `PrivateChannel`.

### Slice 5 - DriverApp Lint Error Repair

- Restored the missing `react-native-maps` imports in the three ride screens that render map components.
- Removed an unused realtime WebSocket variable.
- Kept existing non-blocking lint warnings documented for later cleanup.

### Slice 6 - Redis Live Location Backend

- Added `DriverLocationService` as the live-location hot path.
- Stores the latest driver payload at `driver:location:{driverId}` with a 60-second TTL.
- Maintains the `drivers:online:geo` Redis GEO index.
- Removes offline drivers from the latest-location key and GEO index immediately.
- Rejects invalid coordinate ranges, unrealistic speed/accuracy, future samples, samples older than two minutes, and negative sequence numbers.
- Ignores older out-of-order samples when a newer Redis payload already exists.
- Added throttled `PersistDriverLocationSnapshot` queue jobs instead of synchronously writing every GPS update to PostgreSQL/PostGIS.
- Added `GET /api/rides/{id}/driver-location` with ride participant authorization and PostgreSQL fallback.
- Added queued `DriverLocationUpdated` broadcasts on private `ride.{rideId}` channels only for `ACCEPTED` and `STARTED` rides.
- Added private ride-channel authorization and a 60-request-per-minute driver location rate limit.
- Added live-location environment configuration and the dedicated `locations` queue.

### Slice 7 - DriverApp Active-Ride Tracking

- Installed `expo-task-manager` and configured Android/iOS background location permissions.
- Replaced the simple publisher with adaptive tracking:
  - Online idle: balanced accuracy, approximately 15 seconds or 40 meters.
  - Active ride: high accuracy, approximately 5 seconds or 10 meters.
- Added active-ride background location updates with an Android foreground-service notification.
- Added recorded timestamps, sequence numbers, accuracy, heading, and speed.
- Coalesces offline updates by retaining only the newest pending sample.
- Starts active tracking when a ride is accepted and restores it on the ride details screen.
- Stops active tracking after completion or when the backend reports that no active ride remains.

### Slice 8 - PassengerApp Live Tracking

- Installed `pusher-js`.
- Implemented the previously empty `trackingService.ts`.
- Fetches an initial Redis-backed driver-location snapshot.
- Subscribes to the authenticated private `ride.{rideId}` channel.
- Ignores out-of-order events and reports stale location after 20 seconds.
- Uses 10-second polling only while WebSocket delivery is unavailable.
- Cleans up WebSocket subscriptions, stale timers, and polling on screen unmount.
- Added live/stale/fallback status to the passenger live-tracker UI.
- Supports tracking during both `ACCEPTED` and `STARTED` ride states.

### Slice 9 - Remaining Resource Authorization

- Replaced broad authenticated CRUD resources with explicit least-privilege routes.
- Restricted passenger and driver profile operations by role.
- Restricted driver documents to the owning driver and prevents drivers from changing verification state.
- Restricted vehicle reads and updates to the owning driver or administrators with `manage_vehicles`; deletion and status changes remain admin permission protected.
- Restricted wallet transactions, notifications, and support tickets to the authenticated owner.
- Restricted rating creation to the passenger who owns a completed ride and rating reads to authorized ride participants.
- Removed exposed ride-status, ride-promotion, OTP-verification, and unsupported mutation routes.
- Kept promotion mutations, driver/passenger management, and destructive vehicle operations admin-only.

### Slice 10 - Idempotent Ride and Payment Mutations

- Added required `Idempotency-Key` middleware to ride creation, cancellation, driver transitions, and payment processing.
- Added request fingerprinting so one key cannot be reused for a different mutation.
- Replays completed responses, rejects concurrent duplicate requests, recovers abandoned processing keys after five minutes, and retains completed responses for 24 hours.
- Added automatic idempotency keys to DriverApp and PassengerApp mutation requests.
- Added a database uniqueness constraint allowing only one payment per ride and one use of each transaction ID.
- Reworked payment processing to lock the ride and wallet rows inside one retried transaction.
- Replaced predictable payment transaction IDs with cryptographically random IDs.
- Added request-fingerprint unit tests and opt-in PostgreSQL row-lock/payment-uniqueness integration tests.

## Live Location Interfaces

### Backend Endpoints

- `POST /api/driver-locations`
  - Driver-only.
  - Rate limited to 60 requests per minute.
  - Writes the live payload to Redis and schedules a throttled PostgreSQL/PostGIS snapshot.
- `GET /api/rides/{id}/driver-location`
  - Available only to authorized ride participants and privileged support users.
  - Reads Redis first and falls back to PostgreSQL/PostGIS.
- `POST /api/broadcasting/auth`
  - Sanctum-protected private-channel authorization.

### Private Channels

- `private-driver.rides.{driverId}` for targeted ride offers.
- `private-ride.{rideId}` for active-ride driver-location updates.

### Main Live-Location Files

- Backend hot path: `backend-api/app/Services/Locations/DriverLocationService.php`
- Backend snapshot job: `backend-api/app/Jobs/PersistDriverLocationSnapshot.php`
- Backend event: `backend-api/app/Events/DriverLocationUpdated.php`
- Backend snapshot controller: `backend-api/app/Http/Controllers/Api/RideLocationController.php`
- Driver publisher: `DriverApp/src/services/driverLocationSync.js`
- Passenger subscriber: `PassengerApp/app/services/location/trackingService.ts`
- Passenger tracking screen: `PassengerApp/app/live-tracker.tsx`

## Verification

- Ride policy tests: passed, 6 tests and 21 assertions.
- PHP syntax checks for Slice 1 files: passed.
- Route inspection confirmed `driver-locations` exposes only `POST /api/driver-locations`.
- Ride state-machine tests: passed, 11 tests and 11 assertions.
- Slice 2 PHP syntax checks: passed.
- Route inspection confirmed only seven supported ride routes remain.
- Role middleware tests: passed, 4 tests and 6 assertions.
- Full backend suite after Slice 3: passed, 23 tests and 40 assertions.
- Route inspection confirmed role middleware is attached to ride, location, and payment workflows.
- Private targeted-offer test: passed.
- Full backend suite after Slice 4: passed, 24 tests and 42 assertions.
- Broadcasting route inspection confirmed `/api/broadcasting/auth` uses `api` and `auth:sanctum` middleware.
- DriverApp lint after Slice 5: passed with 0 errors and 23 existing warnings.
- Laravel Pint formatting pass: completed for all changed backend PHP files.
- Live-location backend test: passed; backend suite now has 25 tests and 46 assertions.
- DriverApp lint after live tracking: passed with 0 errors and 23 existing warnings.
- DriverApp Expo public config confirms Android/iOS background-location permissions.
- PassengerApp live-location files pass lint and targeted TypeScript checks.
- Redis runtime connectivity check failed because Laravel on Windows cannot reach `127.0.0.1:6379`; this matches the existing `REDIS_SETUP_GUIDE.md` issue.
- `git diff --check`: passed.
- Remaining-resource route inspection confirmed role restrictions and explicit least-privilege routes.
- Idempotency middleware route inspection confirmed all ride/payment mutations require an `Idempotency-Key`.
- Backend suite after Slices 9-10: passed, 29 tests and 53 assertions; 2 PostgreSQL integration tests skipped without a dedicated test DSN.
- DriverApp lint after idempotency client changes: passed with 0 errors and 23 existing warnings.
- PassengerApp API client targeted lint after idempotency client changes: passed.

## Verification Status

| Area | Result |
|---|---|
| Backend tests | Passed: 29 tests, 53 assertions; 2 PostgreSQL tests skipped |
| Laravel Pint | Passed |
| Backend live-location routes | Confirmed |
| DriverApp lint | Passed with 0 errors and 23 existing warnings |
| DriverApp background permission config | Confirmed |
| Passenger live-tracking targeted lint | Passed with 0 errors and 7 warnings |
| Passenger full lint | Blocked by one existing `react-native-tab-view` module-resolution error |
| Redis runtime connection | Blocked: Windows Laravel cannot reach `127.0.0.1:6379` |
| Real-device background tracking | Pending |
| End-to-end Redis/Reverb/PostGIS test | Pending |

## Known Constraints

- The test configuration uses SQLite, but multiple existing migrations contain PostgreSQL/PostGIS-specific SQL. Full feature tests may require a dedicated PostgreSQL/PostGIS test database or migration portability work.
- Ride cancellation rules currently allow the owning passenger and administrators. Driver-initiated cancellation requires a separately defined product/support flow.
- Several admin-facing broadcast events still use public channels and require a separate authorization review.
- PostgreSQL concurrency integration tests require `RUN_POSTGRES_CONCURRENCY_TESTS=true` and a dedicated `POSTGRES_CONCURRENCY_DSN`; they were added but not executed locally.
- The payment uniqueness migration requires existing duplicate payment rows to be resolved before deployment.
- PassengerApp has existing project-wide lint/type-check failures outside live tracking, including generated/example-app TypeScript errors.
- PassengerApp full lint still has one pre-existing module-resolution error for `react-native-tab-view`; targeted live-tracking lint passes with zero errors.
- Background tracking must be verified on real Android and iOS development builds; Expo Go does not fully support this production behavior.
- Production requires a dedicated worker for the `locations` queue.

## Live Location Runtime Requirements

- Run Redis and configure the backend Redis variables.
- Run Reverb with `php artisan reverb:start`.
- Run a dedicated location worker:
  - `php artisan queue:work redis --queue=locations --tries=3`
- Run the ride/default workers separately so location traffic cannot delay ride matching.
- Configure both mobile apps with matching API, WebSocket host, port, scheme, and Reverb app key values.
- Build DriverApp as an Android/iOS development or production build before testing background and locked-screen tracking.
- Verify permission-denied, background, locked-screen, offline, reconnect, completion, cancellation, stale-location, and Redis-outage behavior on real devices.

## Next Slice

1. Fix the local Redis connection and run an end-to-end driver-to-passenger live-location test.
2. Verify foreground, background, locked-screen, offline, reconnect, completion, and cancellation behavior on real devices.
3. Add production-like Redis/PostGIS/Reverb integration and load tests.
4. Run the opt-in PostgreSQL ride/payment concurrency suite against an isolated test database.
5. Review and privatize remaining admin-facing broadcast channels.
