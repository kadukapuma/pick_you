# PickMe Backend Implementation Guide

This document contains the rest of the crucial implementations required for the PickMe backend system, including Model Relationships, Ride Booking Logic, and Real-time Tracking structures.

## 1. Model Relationships

Update your generated models to include the exact relationships mapped out in the ER diagram.

### `app/Models/Passenger.php`
```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Passenger extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'nic', 'profile_image', 'wallet_balance'];

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function rides() {
        return $this->hasMany(Ride::class);
    }

    public function payments() {
        return $this->hasMany(Payment::class);
    }
}
```

### `app/Models/Driver.php`
```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Driver extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'license_number', 'vehicle_type', 'status', 'rating', 'is_verified'];

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function vehicles() {
        return $this->hasMany(Vehicle::class);
    }

    public function locations() {
        return $this->hasMany(DriverLocation::class);
    }

    public function rides() {
        return $this->hasMany(Ride::class);
    }
}
```

### `app/Models/Vehicle.php`
```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vehicle extends Model
{
    use HasFactory;

    protected $fillable = ['driver_id', 'vehicle_number', 'brand', 'model', 'color', 'year', 'seat_capacity', 'vehicle_type', 'is_active'];

    public function driver() {
        return $this->belongsTo(Driver::class);
    }

    public function rides() {
        return $this->hasMany(Ride::class);
    }
}
```

### `app/Models/Ride.php`
```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ride extends Model
{
    use HasFactory;

    protected $fillable = [
        'ride_code', 'passenger_id', 'driver_id', 'vehicle_id', 'fare_id',
        'pickup_address', 'pickup_lat', 'pickup_lng', 'drop_address', 'drop_lat', 'drop_lng',
        'distance_km', 'estimated_fare', 'final_fare', 'status',
        'requested_at', 'accepted_at', 'started_at', 'completed_at', 'cancelled_at'
    ];

    public function passenger() { return $this->belongsTo(Passenger::class); }
    public function driver() { return $this->belongsTo(Driver::class); }
    public function vehicle() { return $this->belongsTo(Vehicle::class); }
    public function fareConfig() { return $this->belongsTo(FareConfig::class, 'fare_id'); }
    
    public function statuses() { return $this->hasMany(RideStatus::class); }
    public function payment() { return $this->hasOne(Payment::class); }
    public function rating() { return $this->hasOne(Rating::class); }
}
```

---

## 2. Ride Booking Logic

The ride booking process requires calculating distances, matching with drivers, and updating ride states. This goes into `RideController.php`.

### `app/Http/Controllers/Api/RideController.php`
```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ride;
use App\Models\FareConfig;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;

class RideController extends Controller
{
    use ApiResponse;

    /**
     * Passenger requests a new ride
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'vehicle_type' => 'required|string',
            'pickup_address' => 'required|string',
            'pickup_lat' => 'required|numeric',
            'pickup_lng' => 'required|numeric',
            'drop_address' => 'required|string',
            'drop_lat' => 'required|numeric',
            'drop_lng' => 'required|numeric',
            'distance_km' => 'required|numeric'
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        $passenger = $request->user()->passenger;

        // Calculate Estimated Fare based on vehicle type
        $fareConfig = FareConfig::where('vehicle_type', $request->vehicle_type)->where('is_active', true)->first();
        if (!$fareConfig) {
            return $this->error('Selected vehicle type is currently unavailable', 400);
        }

        $estimatedFare = $fareConfig->base_fare + ($request->distance_km * $fareConfig->per_km_rate);

        // Create the Ride record
        $ride = Ride::create([
            'ride_code' => strtoupper(Str::random(8)),
            'passenger_id' => $passenger->id,
            'fare_id' => $fareConfig->id,
            'pickup_address' => $request->pickup_address,
            'pickup_lat' => $request->pickup_lat,
            'pickup_lng' => $request->pickup_lng,
            'drop_address' => $request->drop_address,
            'drop_lat' => $request->drop_lat,
            'drop_lng' => $request->drop_lng,
            'distance_km' => $request->distance_km,
            'estimated_fare' => $estimatedFare,
            'status' => 'REQUESTED',
            'requested_at' => now(),
        ]);

        // Log the status
        $ride->statuses()->create([
            'status' => 'REQUESTED',
            'notes' => 'Passenger requested a ride.'
        ]);

        // TODO: Trigger Event/WebSocket to broadcast to nearby drivers

        return $this->success($ride, 'Ride requested successfully', 201);
    }

    /**
     * Driver accepts the ride
     */
    public function acceptRide(Request $request, $id)
    {
        $ride = Ride::find($id);

        if (!$ride || $ride->status !== 'REQUESTED') {
            return $this->error('Ride is no longer available', 400);
        }

        $driver = $request->user()->driver;
        $vehicle = $driver->vehicles()->where('is_active', true)->first();

        if (!$vehicle) {
            return $this->error('No active vehicle found for driver', 400);
        }

        $ride->update([
            'driver_id' => $driver->id,
            'vehicle_id' => $vehicle->id,
            'status' => 'ACCEPTED',
            'accepted_at' => now()
        ]);

        $ride->statuses()->create([
            'status' => 'ACCEPTED',
            'notes' => 'Driver accepted the ride.'
        ]);

        return $this->success($ride, 'Ride accepted successfully');
    }
}
```

Add the `acceptRide` endpoint to `routes/api.php`:
```php
Route::middleware('auth:sanctum')->group(function () {
    // ...
    Route::post('/rides/{id}/accept', [App\Http\Controllers\Api\RideController::class, 'acceptRide']);
});
```

---

## 3. Realtime Driver Tracking Updates

Drivers must continuously push their coordinates.

### `app/Http/Controllers/Api/DriverLocationController.php`
```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DriverLocation;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DriverLocationController extends Controller
{
    use ApiResponse;

    public function updateLocation(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'heading' => 'nullable|numeric',
            'speed' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        $driver = $request->user()->driver;

        // Update or Create Location
        $location = DriverLocation::updateOrCreate(
            ['driver_id' => $driver->id],
            [
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'heading' => $request->heading ?? 0,
                'speed' => $request->speed ?? 0,
            ]
        );

        // TODO: Broadcast Location via Laravel Reverb / Pusher to the passenger

        return $this->success($location, 'Location updated successfully');
    }
}
```

---

## 4. Payment Setup

Once a ride is completed, a payment record is generated.

### `app/Http/Controllers/Api/PaymentController.php`
```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ride;
use App\Models\Payment;
use App\Models\WalletTransaction;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    use ApiResponse;

    public function processPayment(Request $request, $ride_id)
    {
        $ride = Ride::findOrFail($ride_id);

        if ($ride->status !== 'COMPLETED') {
            return $this->error('Ride must be completed to process payment', 400);
        }

        if ($ride->payment) {
            return $this->error('Payment has already been processed for this ride', 400);
        }

        $paymentMethod = $request->payment_method ?? 'cash'; // 'cash', 'card', 'wallet'

        DB::beginTransaction();
        try {
            // Create Payment Record
            $payment = Payment::create([
                'ride_id' => $ride->id,
                'passenger_id' => $ride->passenger_id,
                'payment_method' => $paymentMethod,
                'amount' => $ride->final_fare,
                'transaction_id' => uniqid('txn_'),
                'payment_status' => $paymentMethod === 'cash' ? 'COMPLETED' : 'PENDING',
                'paid_at' => $paymentMethod === 'cash' ? now() : null,
            ]);

            // Handle Wallet Payment Logic
            if ($paymentMethod === 'wallet') {
                $passenger = $ride->passenger;
                if ($passenger->wallet_balance < $ride->final_fare) {
                    throw new \Exception('Insufficient wallet balance');
                }

                $passenger->wallet_balance -= $ride->final_fare;
                $passenger->save();

                WalletTransaction::create([
                    'user_id' => $passenger->user_id,
                    'transaction_type' => 'debit',
                    'amount' => $ride->final_fare,
                    'balance_after' => $passenger->wallet_balance,
                    'description' => "Paid for ride " . $ride->ride_code
                ]);

                $payment->update(['payment_status' => 'COMPLETED', 'paid_at' => now()]);
            }

            DB::commit();
            return $this->success($payment, 'Payment processed successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->error('Payment processing failed: ' . $e->getMessage(), 500);
        }
    }
}
```

## Summary
To finish the implementation, you can copy the code above into your respective files. You are fully equipped with:
- **Clean Models**: Strict Eloquent relationship mappings preventing data orphan issues.
- **API Traits**: Scalable JSON response management (`ApiResponse` trait).
- **Core Logistics Flow**: Handled in `RideController`, `PaymentController`, and `DriverLocationController`.
