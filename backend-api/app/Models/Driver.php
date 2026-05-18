<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Driver extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'license_number', 'license_front_path', 'license_back_path', 'vehicle_type', 'availability', 'status', 'rating', 'dob', 'address'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function vehicles()
    {
        return $this->hasMany(Vehicle::class);
    }

    public function locations()
    {
        return $this->hasMany(DriverLocation::class);
    }

    public function rides()
    {
        return $this->hasMany(Ride::class);
    }

    public function vehicleImages()
    {
        return $this->hasMany(VehicleImage::class);
    }
}
