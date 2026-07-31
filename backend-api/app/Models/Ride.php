<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ride extends Model
{
    use HasFactory;

    protected $fillable = [
        'ride_code', 'passenger_id', 'driver_id', 'vehicle_id', 'fare_id',
        'pickup_address', 'pickup_point', 'pickup_geog', 'drop_address', 'drop_point', 'drop_geog',
        'distance_km', 'estimated_distance_km', 'estimated_duration_minutes',
        'actual_distance_km', 'actual_duration_minutes', 'waiting_minutes',
        'chargeable_waiting_minutes', 'extra_distance_km', 'extra_distance_fare',
        'waiting_fare', 'fare_breakdown', 'estimated_fare', 'final_fare', 'status',
        'payment_method', 'commission_rate', 'commission_amount', 'driver_earning',
        'fare_calculation_version', 'last_processed_location_sequence',
        'last_processed_location_recorded_at',
        'requested_at', 'accepted_at', 'arrived_at', 'started_at', 'completed_at', 'cancelled_at',
        'cancel_reason', 'cancelled_by'
    ];

    protected $casts = [
        'fare_breakdown' => 'array',
        // Without these, decimal scale depends on the database driver: Postgres
        // returns "60.00" where SQLite returns "60".
        'commission_rate' => 'decimal:4',
        'commission_amount' => 'decimal:2',
        'driver_earning' => 'decimal:2',
        'requested_at' => 'datetime',
        'accepted_at' => 'datetime',
        'arrived_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'last_processed_location_sequence' => 'integer',
        'last_processed_location_recorded_at' => 'datetime',
    ];

    // Append virtual attributes to JSON responses
    protected $appends = [
        'pickup_latitude', 'pickup_longitude', 
        'drop_latitude', 'drop_longitude'
    ];

    public function passenger() { return $this->belongsTo(Passenger::class); }
    public function driver() { return $this->belongsTo(Driver::class); }
    public function vehicle() { return $this->belongsTo(Vehicle::class); }
    public function fareConfig() { return $this->belongsTo(FareConfig::class, 'fare_id'); }
    
    public function statuses() { return $this->hasMany(RideStatus::class); }
    public function payment() { return $this->hasOne(Payment::class); }
    public function rating() { return $this->hasOne(Rating::class); }
    public function locationPoints() { return $this->hasMany(RideLocationPoint::class); }

    /**
     * Parse PostgreSQL point "(lng,lat)" into components.
     */
    protected function parsePoint(mixed $point): ?array
    {
        if (!$point) {
            return null;
        }

        if (is_string($point)) {
            $clean = trim(str_replace(['(', ')'], '', $point));
            $parts = array_map('trim', explode(',', $clean));

            if (count($parts) >= 2) {
                return [
                    'lng' => (float) $parts[0],
                    'lat' => (float) $parts[1],
                ];
            }
        }

        return null;
    }

    public function getPickupLatitudeAttribute(): ?float
    {
        $parsed = $this->parsePoint($this->pickup_point);

        return $parsed['lat'] ?? null;
    }

    public function getPickupLongitudeAttribute(): ?float
    {
        $parsed = $this->parsePoint($this->pickup_point);

        return $parsed['lng'] ?? null;
    }

    public function getDropLatitudeAttribute(): ?float
    {
        $parsed = $this->parsePoint($this->drop_point);

        return $parsed['lat'] ?? null;
    }

    public function getDropLongitudeAttribute(): ?float
    {
        $parsed = $this->parsePoint($this->drop_point);

        return $parsed['lng'] ?? null;
    }
}
