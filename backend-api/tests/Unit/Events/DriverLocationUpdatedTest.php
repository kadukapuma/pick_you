<?php

namespace Tests\Unit\Events;

use App\Events\DriverLocationUpdated;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Tests\TestCase;

class DriverLocationUpdatedTest extends TestCase
{
    public function test_broadcasts_on_the_active_rides_private_channel(): void
    {
        $event = new DriverLocationUpdated(
            ride_id: 123,
            driver_id: 45,
            latitude: 6.9271,
            longitude: 79.8612,
            heading: 120,
            speed: 8.4,
            accuracy: 6,
            recorded_at: '2026-06-12T10:30:00Z',
            sequence: 583,
        );

        $channel = $event->broadcastOn();

        $this->assertInstanceOf(PrivateChannel::class, $channel);
        $this->assertInstanceOf(ShouldBroadcastNow::class, $event);
        $this->assertSame('private-ride.123', $channel->name);
        $this->assertSame('DriverLocationUpdated', $event->broadcastAs());
    }
}
