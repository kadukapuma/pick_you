<?php

namespace Tests\Unit\Events;

use App\Events\RideRequestedTargeted;
use App\Models\Ride;
use Illuminate\Broadcasting\PrivateChannel;
use PHPUnit\Framework\TestCase;

class RideRequestedTargetedTest extends TestCase
{
    public function test_broadcasts_on_the_target_drivers_private_channel(): void
    {
        $ride = new Ride([
            'ride_code' => 'RIDE1234',
            'pickup_address' => 'Pickup',
            'drop_address' => 'Drop',
            'distance_km' => 5,
            'estimated_fare' => 1000,
        ]);
        $ride->id = 123;
        $ride->setRelation('fareConfig', null);
        $ride->setRelation('passenger', null);

        $event = new RideRequestedTargeted($ride, 45);
        $channel = $event->broadcastOn();

        $this->assertInstanceOf(PrivateChannel::class, $channel);
        $this->assertSame('private-driver.rides.45', $channel->name);
    }
}
