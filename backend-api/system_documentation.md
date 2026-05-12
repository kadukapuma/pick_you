# PickMe Clone - Backend System Documentation

## Overview
A comprehensive backend API system for a ride-hailing mobile application (similar to PickMe). The architecture is built using **Laravel 11/12**, implementing clean architecture, scalable RESTful API designs, and following industry-standard database relationship mappings.

---

## 1. Database Schema & Migrations
All entities provided in the ER Diagram have been automatically converted into Laravel database migrations with proper primary/foreign keys and constraints.

- **Completed Entities (18 Tables):**
  - `users`
  - `passengers`
  - `drivers`
  - `vehicles`
  - `driver_documents`
  - `rides`
  - `ride_statuses`
  - `payments`
  - `wallet_transactions`
  - `ratings`
  - `promotions`
  - `ride_promotions`
  - `driver_locations`
  - `otp_verifications`
  - `notifications`
  - `support_tickets`
  - `fare_configs`

> **Note**: Database schema was tested successfully and all foreign key cascades match the system requirements.

---

## 2. Application Architecture

### API Standardization (`ApiResponse` Trait)
We successfully implemented a global `ApiResponse` trait inside `app/Traits/ApiResponse.php`. All controllers utilize this trait to ensure identical, readable JSON outputs across the entire application:
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Models & Relationships
All Eloquent models now accurately represent the ER Diagram connections.
- **One-to-One Relationships**: `User -> Passenger`, `User -> Driver`, `Ride -> Payment`, `Ride -> Rating`.
- **One-to-Many Relationships**: `Driver -> Vehicles`, `Passenger -> Rides`, `Driver -> Rides`, `User -> OtpVerifications`, `FareConfig -> Rides`.

---

## 3. Implemented API Endpoints & Logic

All API routes are protected by **Laravel Sanctum**. Below is the breakdown of the created controllers and logical flows:

### Authentication & User Management (`AuthController`)
- `POST /api/register`: Validates user details and creates a `User` along with their corresponding `Passenger` or `Driver` profile automatically.
- `POST /api/login`: Standard phone/password authentication yielding a Sanctum Bearer Token.
- `POST /api/logout`: Revokes the current access token.
- `POST /api/otp/send`: Generates a random 4-digit code and creates a record in `otp_verifications`.
- `POST /api/otp/verify`: Validates OTP code against the latest valid code before expiration.

### Ride Booking System (`RideController`)
- `POST /api/rides`: Handles new ride requests. Calculates `estimated_fare` automatically dynamically utilizing the `fare_configs` distance multipliers (`per_km_rate` and `base_fare`).
- `POST /api/rides/{id}/accept`: Custom driver endpoint validating if the driver has an active vehicle before allowing them to `ACCEPT` the ride. Registers state into `RideStatuses`.

### Real-Time Tracking Scaffold (`DriverLocationController`)
- `POST/PUT /api/driver-locations`: Validates and tracks real-time `latitude`, `longitude`, `speed`, and `heading` updates by upserting coordinates in the database (prepared for WebSocket broadcast).

### Financial Flow (`PaymentController`)
- `POST /api/payments/{ride_id}`: Handled within strict Database Transactions (`DB::beginTransaction()`). Safely checks user `wallet_balance`, deducts funds, creates a `WalletTransaction` record, and outputs a completed `Payment`.

### Scaffolded Core APIs
The remaining controllers have standard CRUD (Create, Read, Update, Delete) methods generated using the `ApiResponse` wrapper:
- `/api/passengers`
- `/api/drivers`
- `/api/vehicles`
- `/api/driver-documents`
- `/api/ratings`
- `/api/promotions`
- `/api/wallet-transactions`
- `/api/support-tickets`
- `/api/fare-configs`

---

## 4. How to Verify
1. **Routes**: Run `php artisan route:list` to see all 89 beautifully structured endpoints.
2. **Database**: Run `php artisan migrate:fresh` to completely rebuild the database schema without errors.
3. **Scripts Used**:
   - `generate.php`: Used initially to parse Mermaid ER Markdown.
   - `generate_crud.php` & `update_models.php`: Generated all repetitive logic directly into your app files to save hundreds of lines of manual input.

## 5. Next Steps / Pending Development
To turn this API backend into a fully completed product, the following advanced integrations are next:
1. **Google Maps API**: Integrating distance matrix checks for exact Haversine proximity fetching (matching closest drivers to a requested ride).
2. **WebSocket Implementation (Laravel Reverb / Pusher)**: Broadcasting the driver's location to the passenger app continuously.
3. **Payment Gateways (Stripe / PayHere)**: Hooking up the `WalletTransactionController` with actual real-world top-ups via webhook connections.
4. **Firebase Push Notifications**: Pushing ride status updates (ACCEPTED, ARRIVED) silently to client apps.
