<?php

namespace App\Services\RideMatching;

use Illuminate\Support\Facades\Redis;

class DriverRejectionCooldown
{
    private const KEY_PREFIX = 'driver:rejection_cooldown:';
    private const RIDE_KEY_PREFIX = 'driver:rejected_ride:';

    public function record(int $driverId, ?int $rideId = null): void
    {
        // Cooldown feature disabled
    }

    public function isOnCooldown(int $driverId, ?int $rideId = null): bool
    {
        // Cooldown feature disabled
        return false;
    }

    /**
     * @param  array<int>  $driverIds
     * @return array<int>
     */
    public function filterCooledDown(array $driverIds, ?int $rideId = null): array
    {
        // Cooldown feature disabled
        return [];
    }

    private function key(int $driverId): string
    {
        return self::KEY_PREFIX . $driverId;
    }

    private function rideKey(int $driverId, int $rideId): string
    {
        return self::RIDE_KEY_PREFIX . $driverId . ':' . $rideId;
    }
}
