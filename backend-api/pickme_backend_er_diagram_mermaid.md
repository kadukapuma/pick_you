# Ride Hailing System ER Diagram (Mermaid)

```mermaid
erDiagram

    USERS {
        bigint id PK
        string first_name
        string last_name
        string email
        string phone
        string password
        string role
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    PASSENGERS {
        bigint id PK
        bigint user_id FK
        string nic
        string profile_image
        decimal wallet_balance
        timestamp created_at
        timestamp updated_at
    }

    DRIVERS {
        bigint id PK
        bigint user_id FK
        string license_number
        string vehicle_type
        string status
        decimal rating
        boolean is_verified
        timestamp created_at
        timestamp updated_at
    }

    VEHICLES {
        bigint id PK
        bigint driver_id FK
        string vehicle_number
        string brand
        string model
        string color
        integer year
        integer seat_capacity
        string vehicle_type
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    DRIVER_DOCUMENTS {
        bigint id PK
        bigint driver_id FK
        string document_type
        string document_url
        date expiry_date
        boolean is_verified
        timestamp created_at
        timestamp updated_at
    }

    RIDES {
        bigint id PK
        string ride_code
        bigint passenger_id FK
        bigint driver_id FK
        bigint vehicle_id FK
        bigint fare_id FK
        string pickup_address
        decimal pickup_lat
        decimal pickup_lng
        string drop_address
        decimal drop_lat
        decimal drop_lng
        decimal distance_km
        decimal estimated_fare
        decimal final_fare
        string status
        timestamp requested_at
        timestamp accepted_at
        timestamp started_at
        timestamp completed_at
        timestamp cancelled_at
        timestamp created_at
        timestamp updated_at
    }

    RIDE_STATUSES {
        bigint id PK
        bigint ride_id FK
        string status
        text notes
        timestamp created_at
    }

    PAYMENTS {
        bigint id PK
        bigint ride_id FK
        bigint passenger_id FK
        string payment_method
        decimal amount
        string transaction_id
        string payment_status
        timestamp paid_at
        timestamp created_at
    }

    WALLET_TRANSACTIONS {
        bigint id PK
        bigint user_id FK
        string transaction_type
        decimal amount
        decimal balance_after
        string description
        timestamp created_at
    }

    RATINGS {
        bigint id PK
        bigint ride_id FK
        bigint passenger_id FK
        bigint driver_id FK
        integer rating
        text review
        timestamp created_at
    }

    PROMOTIONS {
        bigint id PK
        string promo_code
        string description
        decimal discount_amount
        decimal minimum_amount
        date start_date
        date end_date
        boolean is_active
        timestamp created_at
    }

    RIDE_PROMOTIONS {
        bigint id PK
        bigint ride_id FK
        bigint promotion_id FK
        decimal discount_applied
        timestamp created_at
    }

    DRIVER_LOCATIONS {
        bigint id PK
        bigint driver_id FK
        decimal latitude
        decimal longitude
        decimal heading
        decimal speed
        timestamp updated_at
    }

    OTP_VERIFICATIONS {
        bigint id PK
        bigint user_id FK
        string otp_code
        string purpose
        boolean is_verified
        timestamp expires_at
        timestamp created_at
    }

    NOTIFICATIONS {
        bigint id PK
        bigint user_id FK
        string title
        text message
        boolean is_read
        timestamp created_at
    }

    SUPPORT_TICKETS {
        bigint id PK
        bigint user_id FK
        string subject
        text description
        string status
        timestamp created_at
        timestamp updated_at
    }

    FARE_CONFIGS {
        bigint id PK
        string vehicle_type
        decimal base_fare
        decimal per_km_rate
        decimal per_minute_rate
        decimal cancellation_fee
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    USERS ||--o| PASSENGERS : has
    USERS ||--o| DRIVERS : has

    DRIVERS ||--o{ VEHICLES : owns
    DRIVERS ||--o{ DRIVER_DOCUMENTS : uploads
    DRIVERS ||--o{ DRIVER_LOCATIONS : updates

    PASSENGERS ||--o{ RIDES : books
    DRIVERS ||--o{ RIDES : accepts
    VEHICLES ||--o{ RIDES : assigned
    FARE_CONFIGS ||--o{ RIDES : calculates

    RIDES ||--o{ RIDE_STATUSES : tracks
    RIDES ||--|| PAYMENTS : has
    RIDES ||--o| RATINGS : receives
    RIDES ||--o{ RIDE_PROMOTIONS : applies

    PROMOTIONS ||--o{ RIDE_PROMOTIONS : contains

    PASSENGERS ||--o{ PAYMENTS : makes

    USERS ||--o{ WALLET_TRANSACTIONS : owns
    USERS ||--o{ OTP_VERIFICATIONS : verifies
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ SUPPORT_TICKETS : creates

```

## Main Modules

1. User Management
2. Passenger Management
3. Driver Management
4. Vehicle Management
5. Ride Booking System
6. Live Driver Tracking
7. Payment & Wallet System
8. Ratings & Reviews
9. OTP Authentication
10. Promotions & Discounts
11. Notifications
12. Support Ticket System

## Ride Status Flow

```text
REQUESTED
→ ACCEPTED
→ ARRIVED
→ STARTED
→ COMPLETED

or

REQUESTED
→ CANCELLED
```

## Recommended Technologies

- Backend: Laravel 12
- Database: MySQL / PostgreSQL
- Realtime Tracking: WebSocket + Redis
- Queue System: Laravel Queue + Redis
- Maps: Google Maps API
- Authentication: Laravel Sanctum / JWT
- Push Notifications: Firebase Cloud Messaging (FCM)
- Payment Gateway: Stripe / PayHere
- Storage: AWS S3 / Local Storage

## Realtime Driver Tracking Architecture

```text
Driver App
   ↓
WebSocket Server
   ↓
Redis Pub/Sub
   ↓
Laravel Backend API
   ↓
Passenger App Live Map
```

