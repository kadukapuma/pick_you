# PickMe API Testing Guide

You can test these APIs using **Postman**, **Insomnia**, or **ThunderClient**.
Base URL: `http://localhost:8000/api`

> **IMPORTANT**: For any route under "Protected Routes", you must include the Authorization header using the token received from the Login API.
> **Header**: `Authorization: Bearer 1|your_token_here`
> **Header**: `Accept: application/json`

---

## 1. Authentication (Public Routes)

### A. Register a Passenger
**POST** `http://localhost:8000/api/register`
```json
{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "0771234567",
    "password": "password123",
    "password_confirmation": "password123",
    "role": "passenger"
}
```

### B. Register a Driver
**POST** `http://localhost:8000/api/register`
```json
{
    "first_name": "Kamal",
    "last_name": "Perera",
    "email": "kamal@example.com",
    "phone": "0719876543",
    "password": "password123",
    "password_confirmation": "password123",
    "role": "driver"
}
```

### C. Login (Get your Bearer Token)
**POST** `http://localhost:8000/api/login`
```json
{
    "phone": "0771234567",
    "password": "password123"
}
```
*(Copy the `token` from the response to use in the headers for the requests below)*

---

## 2. System Configuration (Protected Route)

Before requesting a ride, the system needs pricing rules. Use the Bearer token of any user to set this up.

### Create Fare Configuration (Protected Route - Use Admin Token)
*Note: This route is strictly protected. You must first register an `admin` user, login to get their token, and use that token.*
**POST** `http://localhost:8000/api/fare-configs`
```json
{
    "vehicle_type": "Tuk",
    "base_fare": 150.00,
    "per_km_rate": 80.00,
    "per_minute_rate": 5.00,
    "cancellation_fee": 100.00,
    "is_active": true
}
```

### Verify a Driver (Protected Route - Use Admin Token)
*Only admins can approve drivers for them to go active.*
**PUT** `http://localhost:8000/api/drivers/1/verify`
*(No JSON body needed, the backend will verify and activate the driver)*

---

## 3. Driver Setup (Protected Routes - Use Driver Token)

Before a driver can accept a ride, they need a vehicle registered to them.

### Add a Vehicle
**POST** `http://localhost:8000/api/vehicles`
```json
{
    "driver_id": 1,
    "vehicle_number": "WP ABC-1234",
    "brand": "Bajaj",
    "model": "RE",
    "color": "Red",
    "year": 2020,
    "seat_capacity": 3,
    "vehicle_type": "Tuk",
    "is_active": true
}
```

### Update Driver Location
**POST** `http://localhost:8000/api/driver-locations`
```json
{
    "latitude": 6.927079,
    "longitude": 79.861244,
    "heading": 90,
    "speed": 40
}
```

---

## 4. Ride Flow (Protected Routes)

### A. Request a Ride (Use Passenger Token)
**POST** `http://localhost:8000/api/rides`
```json
{
    "vehicle_type": "Tuk",
    "pickup_address": "Colombo 03, Kollupitiya",
    "pickup_lat": 6.9147,
    "pickup_lng": 79.8519,
    "drop_address": "Colombo 07, Cinnamon Gardens",
    "drop_lat": 6.9110,
    "drop_lng": 79.8647,
    "distance_km": 3.5
}
```
*(Note down the `id` of the created ride from the response, e.g., ID: `1`)*

### B. Accept the Ride (Use Driver Token)
**POST** `http://localhost:8000/api/rides/1/accept`
*(No JSON body needed, the backend identifies the driver via their token)*

### C. Complete Ride (Admin or System Route - Simple CRUD Test)
**PUT** `http://localhost:8000/api/rides/1`
```json
{
    "status": "COMPLETED",
    "completed_at": "2026-05-06 10:00:00"
}
```

---

## 5. Payments & Wallets (Protected Routes)

### A. Add Money to Passenger Wallet (Use Passenger Token)
Since the `WalletTransactionController` currently uses basic CRUD, you can update the passenger's balance directly via the Passenger API for testing purposes.
**PUT** `http://localhost:8000/api/passengers/1`
```json
{
    "wallet_balance": 2000.00
}
```

### B. Process Ride Payment (Use Passenger Token)
**POST** `http://localhost:8000/api/payments/1`
*(Replace `1` in the URL with the ride ID)*
```json
{
    "payment_method": "wallet"
}
```
*If you want to test cash payments, change `wallet` to `cash`.*

---

## 6. OTP Flow

### A. Send OTP (Public Route)
**POST** `http://localhost:8000/api/otp/send`
```json
{
    "phone": "0771234567",
    "purpose": "login_verification"
}
```

### B. Verify OTP (Public Route)
*Look at the response from the previous request to see the generated `otp_code` since no actual SMS gateway is connected yet.*
**POST** `http://localhost:8000/api/otp/verify`
```json
{
    "phone": "0771234567",
    "otp_code": "1234",
    "purpose": "login_verification"
}
```
