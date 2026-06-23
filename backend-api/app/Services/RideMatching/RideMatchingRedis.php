<?php

namespace App\Services\RideMatching;

use Illuminate\Support\Facades\Redis;

class RideMatchingRedis
{
    private const MATCHING_DRIVERS_PREFIX = 'ride:matching_drivers:';
    private const CURRENT_DRIVER_PREFIX = 'ride:current_driver:';

    /**
     * @param  array<int>  $driverIds
     */
    public function pushMatchingDrivers(int $rideId, array $driverIds): void
    {
        if ($driverIds === []) {
            return;
        }

        $key = $this->matchingDriversKey($rideId);
        $ttl = (int) config('ride.redis.matching_drivers_ttl', 720);

        Redis::pipeline(function ($pipe) use ($key, $driverIds, $ttl) {
            $pipe->del($key);
            $pipe->rpush($key, ...$driverIds);
            $pipe->expire($key, $ttl);
        });
    }

    public function popNextDriver(int $rideId): ?int
    {
        $driverId = Redis::lpop($this->matchingDriversKey($rideId));

        return $driverId !== null && $driverId !== false ? (int) $driverId : null;
    }

    public function setCurrentDriver(int $rideId, int $driverId): void
    {
        $ttl = (int) config('ride.redis.current_driver_ttl', 42);

        Redis::setex($this->currentDriverKey($rideId), $ttl, (string) $driverId);
    }

    public function getCurrentDriver(int $rideId): ?int
    {
        $driverId = Redis::get($this->currentDriverKey($rideId));

        return $driverId !== null ? (int) $driverId : null;
    }

    public function refreshCurrentDriverTtl(int $rideId): void
    {
        $ttl = (int) config('ride.redis.current_driver_ttl', 42);

        Redis::expire($this->currentDriverKey($rideId), $ttl);
    }

    public function cleanup(int $rideId): void
    {
        Redis::del(
            $this->matchingDriversKey($rideId),
            $this->currentDriverKey($rideId),
        );
    }

    public function matchingQueueLength(int $rideId): int
    {
        return (int) Redis::llen($this->matchingDriversKey($rideId));
    }

    private function matchingDriversKey(int $rideId): string
    {
        return self::MATCHING_DRIVERS_PREFIX . $rideId;
    }

    private function currentDriverKey(int $rideId): string
    {
        return self::CURRENT_DRIVER_PREFIX . $rideId;
    }
}
