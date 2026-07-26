# Multi-Role User Implementation Plan

## Purpose

Allow one person to register and use both the Passenger App and Driver App with the same mobile number, while keeping the existing `users` table.

This work is intentionally deferred. This document describes the implementation and rollout plan only.

## Current Problem

The current system stores one role in `users.role` and requires `users.phone` to be unique.

Because each phone number can have only one `users` row, a person registered as a passenger cannot create a separate driver account using the same phone number. Replacing their existing `users.role` value is also unsafe because:

- The user would lose access to their previous role.
- Driver and passenger app sessions could conflict.
- Authorization currently assumes one role per user.
- Suspending a driver currently disables the shared user account and would also block passenger access.

## Recommended Design

Keep one `users` row per real person and store role memberships separately.

```text
users
- id
- phone
- phone_normalized UNIQUE
- first_name
- last_name
- email
- password
- is_active

user_roles
- id
- user_id
- role
- is_active
- created_at
- updated_at
- UNIQUE(user_id, role)

passengers
- id
- user_id UNIQUE
- passenger-specific fields

drivers
- id
- user_id UNIQUE
- driver-specific fields
```

Example:

```text
users:       id=10, phone_normalized=94771234567
user_roles:  user_id=10, role=passenger, is_active=true
user_roles:  user_id=10, role=driver, is_active=true
passengers:  user_id=10
drivers:     user_id=10
```

## Important Rules

1. A phone number identifies one person, not one role.
2. Do not remove the unique phone identity constraint and create duplicate users for different roles.
3. Do not change `users.role` when the user opens a different app.
4. Passenger and driver registration must reuse an existing user after OTP verification.
5. Driver suspension must disable only the driver role, not passenger access.
6. `users.is_active` must represent a global account ban only.
7. Driver and passenger access tokens must identify the app role they were issued for.

## Implementation Phases

### Phase 1 - Add Multi-Role Database Structure

Create a migration that adds:

- A nullable `phone_normalized` column to `users`.
- A `user_roles` table.
- A unique constraint on `user_roles(user_id, role)`.
- A foreign key from `user_roles.user_id` to `users.id`.
- An `is_active` boolean on `user_roles`, defaulting to `true`.

Add unique constraints to:

- `passengers.user_id`
- `drivers.user_id`

Do not remove `users.role` during this phase.

### Phase 2 - Normalize Existing Phone Numbers

Create one shared phone normalization service used by every authentication flow.

For Sri Lankan mobile numbers, store a canonical value such as:

```text
0771234567  -> 94771234567
+94771234567 -> 94771234567
94771234567 -> 94771234567
```

Backfill `users.phone_normalized` for existing users.

Before adding the unique constraint, generate a report of:

- Users whose normalized phone number is invalid.
- Multiple users that resolve to the same normalized phone number.
- Users with missing phone numbers.

Resolve duplicates manually before enforcing:

```text
UNIQUE(users.phone_normalized)
```

### Phase 3 - Backfill User Roles

For every existing user, create a matching `user_roles` record from `users.role`.

Examples:

```text
users.role=passenger   -> user_roles.role=passenger
users.role=driver      -> user_roles.role=driver
users.role=admin       -> user_roles.role=admin
users.role=super_admin -> user_roles.role=super_admin
users.role=operator    -> user_roles.role=operator
```

The backfill must be idempotent so it can be safely retried.

Keep `users.role` temporarily as a legacy compatibility field.

### Phase 4 - Add Models And Role Helpers

Create a `UserRole` model.

Add the following relationship and helper methods to `User`:

```php
public function roles();
public function hasRole(string $role): bool;
public function hasActiveRole(string $role): bool;
public function ensureRole(string $role): UserRole;
```

During the compatibility stage, role checks may fall back to `users.role` if no `user_roles` records exist. Remove that fallback after the migration is fully deployed.

### Phase 5 - Update Registration Flows

Update passenger and driver registration to:

1. Normalize the submitted phone number.
2. Require successful OTP verification.
3. Find the existing user by `phone_normalized`.
4. Create the user only when no matching user exists.
5. Add the requested role with `firstOrCreate`.
6. Create the matching passenger or driver profile with `firstOrCreate`.
7. Reject registration only when the requested role/profile already exists.
8. Return the user, available roles, active role, profile, and app-specific token.

Expected behavior:

| Existing State | Requested Registration | Result |
|---|---|---|
| No user | Passenger | Create user, passenger role, and passenger profile |
| No user | Driver | Create user, driver role, and driver profile |
| Passenger only | Driver | Reuse user and create driver role/profile |
| Driver only | Passenger | Reuse user and create passenger role/profile |
| Passenger already exists | Passenger | Log in or report already registered |
| Driver already exists | Driver | Log in or report already registered |

Use a database transaction and row locking around user lookup and role/profile creation to prevent duplicate records from concurrent requests.

### Phase 6 - Scope Tokens To App Roles

Issue tokens with an ability identifying the active app role:

```php
$user->createToken('passenger_app_token', ['role:passenger']);
$user->createToken('driver_app_token', ['role:driver']);
```

Admin tokens should use the relevant administrative role ability.

Do not depend only on the token name for authorization.

Return these fields from login and registration responses:

```json
{
  "roles": ["passenger", "driver"],
  "active_role": "passenger"
}
```

The Passenger App should request and store a passenger-scoped token. The Driver App should request and store a driver-scoped token.

### Phase 7 - Update Role Authorization

Update `EnsureUserRole` so access requires:

- The user has an active requested role.
- The current token has the matching `role:{role}` ability.

Provide a controlled compatibility path for existing tokens during rollout. Remove it after users have upgraded or logged in again.

Replace direct checks such as:

```php
$user->role === User::ROLE_DRIVER
```

with:

```php
$user->hasActiveRole(User::ROLE_DRIVER)
```

Areas requiring review include:

- Role middleware.
- `RidePolicy`.
- Broadcast channel authorization.
- Driver and passenger profile controllers.
- Ride, rating, payment, vehicle, and location controllers.
- Admin and operator middleware.
- Permission handling and role permissions.

### Phase 8 - Separate Account And Role Status

Use status fields as follows:

- `users.is_active`: globally enable or disable the person.
- `user_roles.is_active`: enable or disable one role.
- `drivers.status`: driver onboarding and approval state.
- `drivers.availability`: whether an approved driver is online for rides.

Update driver suspension and active-status endpoints so they change the driver's role/status only.

Update passenger suspension endpoints so they change the passenger role only.

Only a deliberate global-ban action should update `users.is_active`.

### Phase 9 - Update Authentication Behavior

Passenger OTP login must:

- Find the user by normalized phone.
- Confirm the user has an active passenger role.
- Create the passenger role/profile after verified registration if missing.
- Issue a passenger-scoped token.

Driver login must:

- Find the same user identity.
- Confirm the user has an active driver role.
- Confirm the driver profile/status allows login.
- Issue a driver-scoped token.

Generic/admin login must select or require the appropriate administrative role and issue a matching token.

### Phase 10 - API Response Compatibility

During rollout, continue returning the legacy `role` field where current apps require it.

Also return:

- `roles`
- `active_role`
- The profile matching the active role

Set the legacy `role` response value from the active token role, not from `users.role`.

After both mobile apps and the admin frontend use `active_role` and `roles`, stop exposing or using `users.role`.

### Phase 11 - Testing

Add automated tests for:

- Passenger registration with a new phone.
- Driver registration with a new phone.
- Driver registration using an existing passenger phone.
- Passenger registration using an existing driver phone.
- Duplicate registration for the same role.
- Concurrent registration requests for the same phone and role.
- Phone normalization across local and international formats.
- Passenger token rejected by driver routes.
- Driver token rejected by passenger routes.
- A dual-role user using both app tokens simultaneously.
- Driver suspension does not block passenger access.
- Passenger suspension does not block driver access.
- Global user suspension blocks every role.
- Ride policies for a dual-role user.
- Private driver and ride channel authorization.
- Existing single-role users continue to work during compatibility rollout.

Run the full backend test suite after each implementation phase.

### Phase 12 - Deployment And Rollout

Recommended deployment order:

1. Deploy additive database migrations.
2. Backfill normalized phone numbers and inspect conflicts.
3. Resolve duplicate phone identities.
4. Add the normalized phone unique constraint.
5. Backfill `user_roles`.
6. Deploy backend compatibility code that reads both old and new roles.
7. Deploy updated Passenger App, Driver App, and admin frontend.
8. Monitor authentication failures and authorization denials.
9. Revoke or expire legacy unscoped tokens after the upgrade window.
10. Remove application dependencies on `users.role`.
11. In a later release, drop `users.role` only after confirming it is unused.

## Rollback Strategy

Until the final cleanup phase:

- Keep `users.role` populated with the user's original or primary role.
- Keep role checks capable of using the legacy role if `user_roles` is unavailable.
- Make migrations additive and avoid dropping columns.
- Do not delete passenger or driver profiles during rollback.

If the new authorization behavior causes issues, roll back application code while leaving `user_roles` and `phone_normalized` in place. They are additive and should not break the existing schema.

## Data Conflict Policy

When multiple existing users normalize to the same phone number, do not automatically merge them.

Review:

- Passenger and driver profiles.
- Rides, payments, wallet balances, ratings, vehicles, and documents.
- Email ownership.
- Existing tokens and OTP records.
- Account active and verification states.

Prepare a separate audited merge process if production contains duplicate real-person accounts.

## Main Backend Files Expected To Change

- `app/Models/User.php`
- New `app/Models/UserRole.php`
- `app/Http/Middleware/EnsureUserRole.php`
- `app/Policies/RidePolicy.php`
- `app/Http/Controllers/Api/AuthController.php`
- `app/Http/Controllers/Api/PassengerAuthController.php`
- `app/Http/Controllers/Api/DriverController.php`
- `app/Http/Controllers/Api/PassengerController.php`
- Controllers containing direct `users.role` checks
- `routes/channels.php`
- Authentication and role-related tests
- New database migrations for normalized phones and user roles

## Completion Criteria

This update is complete when:

- One normalized phone number maps to exactly one `users` record.
- The same user can hold both passenger and driver roles.
- The same user can use Passenger App and Driver App tokens simultaneously.
- Each token is restricted to its intended app role.
- Driver suspension does not disable passenger access.
- Passenger suspension does not disable driver access.
- A global account ban disables all access.
- Existing users and app versions remain functional through the planned compatibility period.
- All new multi-role tests and the existing backend test suite pass.

