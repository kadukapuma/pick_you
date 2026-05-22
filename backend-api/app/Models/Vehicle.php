<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vehicle extends Model
{
    use HasFactory;

    protected $fillable = ['driver_id', 'vehicle_type_id', 'vehicle_number', 'brand', 'model', 'color', 'year', 'seat_capacity', 'is_active', 'status'];

    protected $with = ['vehicleType'];

    protected $appends = ['vehicle_type'];

    public function getVehicleTypeAttribute()
    {
        $relation = $this->getRelationValue('vehicleType');
        return $relation?->name;
    }

    public function toArray()
    {
        $array = parent::toArray();
        $array['vehicle_type'] = $this->getVehicleTypeAttribute();
        return $array;
    }

    public function driver() {
        return $this->belongsTo(Driver::class);
    }

    public function vehicleType() {
        return $this->belongsTo(VehicleType::class, 'vehicle_type_id');
    }

    public function rides() {
        return $this->hasMany(Ride::class);
    }

    public function images() {
        return $this->hasOne(VehicleImage::class);
    }
}
