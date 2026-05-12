<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vehicle extends Model
{
    use HasFactory;

    protected $fillable = ['driver_id', 'vehicle_number', 'brand', 'model', 'color', 'year', 'seat_capacity', 'vehicle_type', 'is_active', 'status'];

    public function driver() {
        return $this->belongsTo(Driver::class);
    }

    public function rides() {
        return $this->hasMany(Ride::class);
    }

    public function images() {
        return $this->hasOne(VehicleImage::class);
    }
}
