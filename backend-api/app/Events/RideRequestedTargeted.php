<?php

namespace App\Events;

use App\Models\Ride;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RideRequestedTargeted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $ride_id;
    public string $ride_code;
    public string $vehicle_type;
    public string $pickup_address;
    public string $drop_address;
    public float $distance_km;
    public float $estimated_fare;
    public string $passenger_name;
    public string $requested_at;
    public int $driver_id;

    public function __construct(Ride $ride, int $driverId)
    {
        $this->ride_id = $ride->id;
        $this->ride_code = $ride->ride_code;
        $this->vehicle_type = (string) optional($ride->fareConfig)->vehicle_type;
        $this->pickup_address = (string) $ride->pickup_address;
        $this->drop_address = (string) $ride->drop_address;
        $this->distance_km = (float) $ride->distance_km;
        $this->estimated_fare = (float) $ride->estimated_fare;
        
        $passengerUser = optional($ride->passenger)->user;
        $this->passenger_name = trim(($passengerUser?->first_name ?? 'Passenger') . ' ' . ($passengerUser?->last_name ?? ''));
        
        $this->requested_at = optional($ride->requested_at)?->toISOString() ?? now()->toISOString();
        $this->driver_id = $driverId;
    }

    public function broadcastOn(): Channel
    {
        return new Channel('driver.rides.' . $this->driver_id);
    }

    public function broadcastAs(): string
    {
        return 'RideRequestedTargeted';
    }
}
