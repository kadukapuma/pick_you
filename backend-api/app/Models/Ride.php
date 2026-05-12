<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ride extends Model
{
    use HasFactory;

    protected $fillable = [
        'ride_code', 'passenger_id', 'driver_id', 'vehicle_id', 'fare_id',
        'pickup_address', 'pickup_point', 'drop_address', 'drop_point',
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
     * Accessor for Pickup Latitude
     */
    public function getPickupLatitudeAttribute()
    {
        if ($this->pickup_point && is_string($this->pickup_point)) {
            $coords = str_replace(['(', ')'], '', $this->pickup_point);
            return (float) explode(',', $coords)[1];
        }
        return null;
    }

    /**
     * Accessor for Pickup Longitude
     */
    public function getPickupLongitudeAttribute()
    {
        if ($this->pickup_point && is_string($this->pickup_point)) {
            $coords = str_replace(['(', ')'], '', $this->pickup_point);
            return (float) explode(',', $coords)[0];
        }
        return null;
    }

    /**
     * Accessor for Drop Latitude
     */
    public function getDropLatitudeAttribute()
    {
        if ($this->drop_point && is_string($this->drop_point)) {
            $coords = str_replace(['(', ')'], '', $this->drop_point);
            return (float) explode(',', $coords)[1];
        }
        return null;
    }

    /**
     * Accessor for Drop Longitude
     */
    public function getDropLongitudeAttribute()
    {
        if ($this->drop_point && is_string($this->drop_point)) {
            $coords = str_replace(['(', ')'], '', $this->drop_point);
            return (float) explode(',', $coords)[0];
        }
        return null;
    }
}