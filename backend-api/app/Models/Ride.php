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
        'distance_km', 'estimated_fare', 'final_fare', 'status',
        'requested_at', 'accepted_at', 'started_at', 'completed_at', 'cancelled_at'
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