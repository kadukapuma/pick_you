<?php

namespace App\Events;

use App\Models\Ride;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
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

    public ?float $pickup_lat;

    public ?float $pickup_lng;

    public string $drop_address;

    public ?float $drop_lat;

    public ?float $drop_lng;

    public string $trip_type;

    public ?string $destination_address;

    public ?float $destination_lat;

    public ?float $destination_lng;

    public float $distance_km;

    public float $estimated_fare;

    public string $payment_method;

    public string $passenger_name;

    public ?string $passenger_profile_picture;

    public string $requested_at;

    public int $driver_id;

    public string $expires_at;

    public function __construct(Ride $ride, int $driverId, ?\DateTimeInterface $expiresAt = null)
    {
        $this->ride_id = $ride->id;
        $this->ride_code = $ride->ride_code;
        $this->vehicle_type = (string) optional($ride->fareConfig)->vehicle_type;
        $this->pickup_address = (string) $ride->pickup_address;
        $this->pickup_lat = $ride->pickup_latitude;
        $this->pickup_lng = $ride->pickup_longitude;
        $this->drop_address = (string) $ride->drop_address;
        $this->drop_lat = $ride->drop_latitude;
        $this->drop_lng = $ride->drop_longitude;
        $this->trip_type = (string) ($ride->trip_type ?? 'oneway');
        $this->destination_address = $ride->destination_address;
        $this->destination_lat = $ride->destination_latitude;
        $this->destination_lng = $ride->destination_longitude;
        $this->distance_km = (float) $ride->distance_km;
        $this->estimated_fare = (float) $ride->estimated_fare;
        $this->payment_method = (string) $ride->payment_method;

        $passengerUser = optional($ride->passenger)->user;
        $this->passenger_name = trim(($passengerUser?->first_name ?? 'Passenger').' '.($passengerUser?->last_name ?? ''));
        $this->passenger_profile_picture = $passengerUser?->profile_picture;

        $this->requested_at = optional($ride->requested_at)?->toISOString() ?? now()->toISOString();
        $this->driver_id = $driverId;
        $this->expires_at = ($expiresAt ?? now()->addSeconds((int) config('ride.driver_offer_seconds', 20)))->format(DATE_ATOM);
    }

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('driver.rides.'.$this->driver_id);
    }

    public function broadcastAs(): string
    {
        return 'RideRequestedTargeted';
    }
}
