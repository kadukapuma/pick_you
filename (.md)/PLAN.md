# Pick You Production Implementation Plan

## 1. Goal

Build Pick You into a secure, reliable ride-hailing platform that can grow toward **10 million registered users** without prematurely building an expensive multi-region microservice platform.

This plan assumes that "10000k users" means **10,000,000 registered users**, not 10 million simultaneous users. Capacity must be planned and tested using peak concurrent users, active drivers, active rides, and requests per second.

## 2. Scale Assumptions

These are planning assumptions, not promises. Replace them with measured production data after launch.

| Metric | Initial Target | Growth Target | Long-Term Target |
|---|---:|---:|---:|
| Registered users | 100,000 | 1,000,000 | 10,000,000 |
| Daily active users | 20,000 | 200,000 | 2,000,000 |
| Peak concurrent app sessions | 2,000 | 20,000 | 200,000 |
| Peak online drivers | 1,000 | 10,000 | 100,000 |
| Peak active rides | 300 | 3,000 | 30,000 |
| Driver location updates/sec at 5-second interval | 200 | 2,000 | 20,000 |
| Availability objective | 99.5% | 99.9% | 99.95% |

The system must be load-tested at **2x the expected next-stage peak** before moving to that stage.

## 3. Architecture Strategy

### Build Now

Use a well-structured Laravel modular monolith:

- Laravel 12 API with stateless application instances.
- PostgreSQL with PostGIS as the durable system of record.
- Redis for hot location data, ride-matching state, cache, queues, rate limits, and Reverb scaling.
- Laravel Reverb for real-time events.
- Dedicated queue workers for ride matching, notifications, and low-priority work.
- Object storage and CDN for profile, license, and vehicle images.
- DriverApp and PassengerApp using versioned API contracts and environment-based URLs.

This architecture is simpler to operate and can scale far beyond the current application when correctly indexed, cached, queued, and horizontally deployed.

### Do Not Build Yet

Do not introduce these until measurements prove they are needed:

- Microservices.
- Multi-region active-active writes.
- Kubernetes.
- Kafka or a separate streaming platform.
- A time-series database.
- Database sharding.

Use the scaling triggers in Section 12 before adding them.

## 4. Current Repository Findings

The current codebase already has useful foundations:

- Laravel Sanctum authentication.
- PostgreSQL/PostGIS spatial indexes.
- Redis-backed targeted ride matching.
- Laravel Reverb and mobile WebSocket clients.
- Expo location support in DriverApp.

Critical gaps to resolve before production:

- Broad protected resource routes expose operations without clear role and ownership rules.
- `GET /rides/{id}` does not verify that the authenticated user owns or is assigned to the ride.
- Driver location is written to PostgreSQL on every update; this will become a write bottleneck.
- `driver-locations` is exposed as a broad resource instead of a narrow purpose-built API.
- Existing ride events use public channels; ride and driver data must use authorized private channels.
- Ride acceptance and state transitions need transaction locking and idempotency.
- The API has only scaffold tests.
- Redis, queue, cache, Reverb, and application processes do not yet have a documented production deployment model.
- Reverb currently allows all origins and its rate limiting is disabled by default.
- DriverApp has active local changes; implementation must preserve them.

## 5. Target Request Flows

### 5.1 Ride Request and Matching

1. Passenger submits a ride request with an `Idempotency-Key`.
2. API validates identity, passenger ownership, coordinates, fare, and service availability.
3. API creates the ride and initial status in one PostgreSQL transaction.
4. After commit, a high-priority matching job is queued.
5. Matching reads nearby online drivers from a Redis GEO index.
6. A Lua script or other atomic Redis operation reserves one driver offer at a time.
7. The offer is sent on private channel `private-driver.{driverId}`.
8. Driver acceptance uses a database transaction and row lock so only one driver can win.
9. Ride status changes use an explicit state machine and create an audit record.

PostGIS remains the fallback and correctness source when Redis is unavailable or rebuilding.

### 5.2 Live Driver Location

1. DriverApp samples GPS adaptively:
   - Active ride: every 3-5 seconds or meaningful movement.
   - Online and idle: every 10-20 seconds.
   - Offline: tracking stopped.
2. API authenticates the driver, validates ranges, checks timestamp freshness, and rate-limits updates.
3. Latest location is written to Redis:
   - `driver:location:{driverId}` with a 60-second TTL.
   - Redis GEO index for online driver matching.
4. During an active ride, the latest location is broadcast to private channel `private-ride.{rideId}`.
5. A throttled queue job persists a snapshot to PostgreSQL every 30-60 seconds, on important ride transitions, and at ride completion.
6. PassengerApp fetches the latest snapshot, subscribes to the private ride channel, displays stale state after 20 seconds, and polls only when WebSocket delivery fails.
7. Location access and broadcasts stop immediately when the ride completes or is cancelled.

The live-location request path must not synchronously write every sample to PostgreSQL.

### 5.3 Ride State Machine

Allowed transitions must be centralized and enforced:

```text
REQUESTED -> ACCEPTED -> STARTED -> COMPLETED
REQUESTED -> CANCELLED
ACCEPTED  -> CANCELLED
STARTED   -> CANCELLED only through an approved support/emergency flow
```

Each transition must:

- Verify actor role and ride ownership.
- Lock the ride row in a transaction.
- Be idempotent.
- Record actor, previous status, new status, reason, and timestamp.
- Dispatch events only after the transaction commits.

## 6. Data and API Design

### Required API Changes

Replace broad resource routes with role-specific endpoints:

```text
POST /api/v1/passenger/rides
GET  /api/v1/passenger/rides/{ride}
POST /api/v1/passenger/rides/{ride}/cancel

GET  /api/v1/driver/offers
POST /api/v1/driver/offers/{ride}/accept
POST /api/v1/driver/offers/{ride}/reject
POST /api/v1/driver/rides/{ride}/start
POST /api/v1/driver/rides/{ride}/complete
PUT  /api/v1/driver/location

GET  /api/v1/rides/{ride}/driver-location
```

Requirements:

- Version all mobile APIs under `/api/v1`.
- Use Laravel policies and role middleware for every resource.
- Use form request classes for validation and authorization.
- Return a consistent error envelope and machine-readable error code.
- Require idempotency keys for ride creation, acceptance, payment, cancellation, and completion.
- Paginate every list endpoint using cursor pagination for large or frequently changing datasets.
- Never return full model objects by default; use API resources with explicit fields.
- Keep API compatibility for at least one supported mobile-app version during migrations.

### Location Contract

```json
{
  "ride_id": 123,
  "driver_id": 45,
  "latitude": 6.9271,
  "longitude": 79.8612,
  "heading": 120,
  "speed_mps": 8.4,
  "accuracy_m": 6,
  "recorded_at": "2026-06-12T10:30:00Z",
  "sequence": 583
}
```

Reject impossible coordinates, future timestamps, expired samples, excessive request rates, and out-of-order sequence numbers.

### Database Rules

- Use foreign keys, unique constraints, check constraints, and explicit indexes.
- Add indexes based on real query plans, not guesses.
- Store money as integer minor units or a fixed decimal with a single documented convention.
- Keep a durable ride-status audit table.
- Add `version` or equivalent optimistic concurrency protection where useful.
- Do not store every raw GPS sample forever.
- Partition high-volume append-only tables by time only when table size and query plans justify it.
- Use PgBouncer before increasing application instance counts significantly.
- Add read replicas only for read-heavy endpoints that tolerate replica lag.

## 7. Security and Privacy Requirements

These are launch blockers:

- Enforce passenger, driver, operator, and admin authorization with policies.
- Use private/presence Reverb channels with server-side authorization.
- Restrict Reverb origins; disable client events unless explicitly required.
- Use TLS for API and WebSocket traffic.
- Store secrets in a managed secret store, never committed `.env` files.
- Apply rate limits by IP, authenticated user, driver, and sensitive action.
- Rotate refresh/access tokens and support device/session revocation.
- Require MFA for admin and super-admin accounts.
- Add audit logs for admin actions, ride state changes, payments, and permission changes.
- Encrypt database, object storage, backups, and Redis where supported.
- Define location retention and deletion rules before launch.
- Never log tokens, OTPs, passwords, full payment data, or precise locations in normal application logs.
- Add dependency, secret, and container scanning to CI.

## 8. Reliability and Observability

### Service-Level Indicators

Track at minimum:

- API availability, request rate, error rate, and p50/p95/p99 latency.
- Ride request-to-first-offer latency.
- Ride acceptance success and conflict rate.
- Active rides and online drivers.
- Location update ingest rate, rejected rate, stale rate, and end-to-end latency.
- WebSocket connections, reconnects, failed subscriptions, and broadcast latency.
- Redis latency, memory, evictions, errors, and replication health.
- PostgreSQL connections, CPU, storage, lock waits, slow queries, and replica lag.
- Queue depth, oldest-job age, processing time, retry count, and failed jobs.
- Mobile crash-free sessions and API failures by app version.

### Initial SLOs

| SLI | Initial SLO |
|---|---:|
| API availability | 99.9% monthly |
| Ride mutation error rate | < 0.5% |
| API p95 latency, excluding third parties | < 300 ms |
| Ride request to first driver offer p95 | < 3 seconds |
| Accepted-ride location freshness p95 | < 10 seconds |
| Broadcast delivery latency p95 | < 1 second |

Create alerts from SLO impact, not only CPU and memory thresholds.

### Failure Behavior

- Redis unavailable: preserve ride correctness in PostgreSQL, pause new matching if atomic reservation cannot be guaranteed, and expose a clear degraded state.
- Reverb unavailable: clients reconnect with jittered exponential backoff and PassengerApp polls at a bounded interval.
- Queue backlog: prioritize ride matching and ride transitions over notifications and analytics.
- Map/SMS/payment provider unavailable: use timeouts, retries with jitter, circuit breakers, and idempotency.
- PostgreSQL unavailable: reject writes quickly and safely; never pretend a ride transition succeeded.

## 9. Implementation Roadmap

### Phase 0 - Baseline and Decisions

**Duration:** 1 week

- [ ] Confirm product flows, ride statuses, cancellation rules, and payment behavior.
- [ ] Confirm the scale assumptions in Section 2.
- [ ] Record architecture decisions in short ADR files.
- [ ] Define API response/error conventions and `/api/v1` migration approach.
- [ ] Add CI jobs for backend tests, PHP formatting, mobile lint/type-check, and admin lint/build.
- [ ] Create a production-like Docker Compose development environment for PostgreSQL/PostGIS, Redis, API, queues, and Reverb.
- [ ] Capture baseline API, matching, database, and Reverb load-test results.

**Exit gate:** repeatable local/test environment, CI running, and baseline results documented.

### Phase 1 - Correctness and Security

**Duration:** 2-3 weeks

- [ ] Add Laravel policies and role middleware to all protected resources.
- [ ] Replace unsafe broad ride and driver-location routes with explicit endpoints.
- [ ] Introduce ride state-machine service.
- [ ] Make create, accept, reject, cancel, start, complete, and payment operations transactional and idempotent.
- [ ] Use row locks or equivalent atomic protection for ride acceptance.
- [ ] Dispatch queued events only after database commit.
- [ ] Move driver and ride events to authorized private channels.
- [ ] Restrict Reverb origins and enable appropriate connection/message rate limits.
- [ ] Add validation for coordinates, accuracy, speed, heading, recorded time, and sequence.
- [ ] Add audit logging for sensitive actions.

**Exit gate:** authorization matrix tests pass; concurrent acceptance test proves only one driver can accept; no sensitive public channels remain.

### Phase 2 - Scalable Live Location and Matching

**Duration:** 3-4 weeks

- [ ] Add `DriverLocationService` with Redis latest-location keys and GEO index.
- [ ] Make Redis location update and online/offline changes atomic.
- [ ] Add Redis TTL cleanup and stale-driver removal.
- [ ] Throttle durable PostgreSQL location snapshots through a dedicated queue.
- [ ] Keep PostGIS as matching fallback and Redis rebuild source.
- [ ] Make ride-offer reservation atomic in Redis.
- [ ] Implement background/adaptive tracking in DriverApp.
- [ ] Implement offline coalescing; retain only recent, relevant location samples.
- [ ] Implement PassengerApp snapshot plus private-channel subscription.
- [ ] Add stale state, reconnect backoff, bounded polling fallback, and cleanup.
- [ ] Stop live tracking and revoke access on terminal ride states.

**Exit gate:** end-to-end tracking tests pass on foreground, background, locked-screen, offline, reconnect, cancel, and complete flows.

### Phase 3 - Production Deployment Foundation

**Duration:** 2-3 weeks

- [ ] Containerize API, queue worker, scheduler, and Reverb as separate processes.
- [ ] Deploy at least two API instances and two Reverb instances behind a load balancer.
- [ ] Enable Reverb horizontal scaling through Redis.
- [ ] Deploy managed PostgreSQL/PostGIS with automated backups and point-in-time recovery.
- [ ] Deploy highly available managed Redis with separate logical connections or clusters for cache, queues, and critical matching/location state as scale requires.
- [ ] Add PgBouncer or managed connection pooling.
- [ ] Store uploads in object storage behind a CDN.
- [ ] Add health, readiness, and dependency checks.
- [ ] Add centralized logs, metrics, traces, dashboards, and on-call alerts.
- [ ] Add automated database migrations with rollback/forward-fix procedures.

**Exit gate:** one API or Reverb instance can be terminated without user-visible outage; backup restore is tested.

### Phase 4 - Load, Failure, and Release Testing

**Duration:** 2-3 weeks

- [ ] Build k6 or equivalent scenarios for authentication, ride request, matching, acceptance, location ingest, snapshot fetch, and WebSocket connections.
- [ ] Test sustained expected peak, 2x peak, sudden spikes, and long-running connections.
- [ ] Test Redis failover, Reverb restart, queue backlog, database failover, and third-party timeout behavior.
- [ ] Profile slow queries and validate indexes with query plans.
- [ ] Verify no unbounded list, queue, retry, log, or cache growth.
- [ ] Run mobile battery and data-usage tests.
- [ ] Run security review and penetration test.
- [ ] Practice canary deployment and rollback.

**Exit gate:** 2x next-stage peak passes SLOs with at least 30% capacity headroom and no correctness failures.

### Phase 5 - Controlled Production Rollout

**Duration:** 1-2 weeks, then continuous

- [ ] Launch internal and test users.
- [ ] Canary to 1%, then 10%, 25%, 50%, and 100% traffic.
- [ ] Pause automatically when error-budget or business thresholds are exceeded.
- [ ] Track metrics by API version and mobile-app version.
- [ ] Review capacity, incidents, costs, and slow queries weekly during growth.
- [ ] Run restore and failover drills quarterly.

## 10. Test Strategy

### Backend

- Unit tests for ride state transitions, fare rules, location validation, and matching rules.
- Feature tests for every endpoint and every role/ownership combination.
- Concurrency tests for ride acceptance, payment, cancellation, and completion.
- Redis integration tests for atomic matching, TTLs, stale locations, and cleanup.
- Contract tests for API resources and broadcast payloads.
- Failure tests for Redis, Reverb, queues, PostgreSQL, and third-party providers.

### Mobile

- Driver tracking lifecycle tests.
- Permission-denied and background-location tests.
- Network loss, duplicate request, retry, and out-of-order event tests.
- Passenger subscription, stale state, polling fallback, and cleanup tests.
- Low-end Android device battery, memory, and data-use tests.

### Required CI Gates

- Backend tests and formatter.
- DriverApp lint/type-check/tests.
- PassengerApp lint/type-check/tests.
- Admin lint/build/tests.
- Migration validation on a production-like PostgreSQL/PostGIS instance.
- Dependency and secret scanning.

No phase is complete while its required tests are failing.

## 11. Data Retention and Cost Controls

- Latest driver location in Redis: 60-second TTL.
- Durable in-ride location snapshots: retain only for the agreed support, safety, and legal period.
- Raw operational logs: short retention with redaction.
- Audit/security logs: longer retention with restricted access.
- Delete expired data with scheduled, observable jobs.
- Track cost per completed ride, per active user, per location update, and per provider call.
- Set budgets and alerts for maps, SMS, object storage, logs, Redis, and database usage.

Do not define legal retention periods without counsel for each operating country.

## 12. Scaling Triggers

Scale because of measured limits, not registered-user count alone.

| Trigger | Action |
|---|---|
| API CPU/latency exceeds target at peak | Add stateless API instances and optimize hot endpoints |
| PostgreSQL connections approach safe limit | Add PgBouncer and reduce connection churn |
| Read-heavy endpoints affect primary | Add cache and then read replicas where replica lag is acceptable |
| Redis memory/latency approaches limit | Separate workloads, optimize keys, then introduce Redis Cluster |
| Reverb connection or message benchmark reaches safe limit | Add Reverb instances and validate Redis scaling |
| Queue oldest-job age breaches SLO | Add queue workers, isolate queue classes, optimize jobs |
| Location snapshot table becomes operationally expensive | Partition by time and archive old data |
| One bounded domain repeatedly blocks releases or scaling | Extract that domain into a service with a documented contract |
| Single-region recovery objective is no longer acceptable | Add warm standby and tested regional failover |

Likely first service-extraction candidates, only if required, are live-location ingestion, notifications, and analytics. Ride state and payment correctness should remain strongly consistent and simple for as long as possible.

## 13. Definition of Production Ready

- [ ] Authorization and ownership are enforced on every protected operation.
- [ ] Ride and payment mutations are transactional, idempotent, and concurrency-tested.
- [ ] No precise ride/location data is broadcast on public channels.
- [ ] Live GPS ingest does not synchronously write every sample to PostgreSQL.
- [ ] Redis, PostgreSQL, queues, Reverb, and third-party failures degrade safely.
- [ ] Dashboards, alerts, runbooks, backups, and restore tests exist.
- [ ] Expected peak and 2x peak load tests pass the agreed SLOs.
- [ ] Mobile background tracking, battery use, reconnect behavior, and stale state are verified on real devices.
- [ ] Security review and privacy/retention policy are complete.
- [ ] Canary deployment and rollback procedures are tested.

## 14. Recommended First Sprint

Implement these in order:

1. Add policies and close ride, driver, passenger, location, and payment authorization gaps.
2. Introduce the ride state machine, transactions, row locking, idempotency, and after-commit events.
3. Replace public ride broadcasts with authorized private channels.
4. Add meaningful backend feature and concurrency tests.
5. Implement Redis hot-location storage with throttled PostgreSQL snapshots.
6. Complete DriverApp background tracking and PassengerApp live tracking.
7. Establish production-like deployment, observability, and load tests.

This sequence protects user data and ride correctness first, removes the largest scaling bottleneck second, and adds infrastructure complexity only when the application behavior is measurable and stable.
