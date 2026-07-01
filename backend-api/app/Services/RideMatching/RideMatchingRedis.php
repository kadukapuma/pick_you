<?php

namespace App\Services\RideMatching;

use Illuminate\Support\Facades\Redis;

class RideMatchingRedis
{
    private const MATCHING_DRIVERS_PREFIX = 'ride:matching_drivers:';
    private const CURRENT_DRIVER_PREFIX = 'ride:current_driver:';
    private const DRIVER_CURRENT_RIDES_PREFIX = 'driver:current_rides:';

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
        $currentDriverKey = $this->currentDriverKey($rideId);
        $previousDriverId = $this->getCurrentDriver($rideId);

        Redis::pipeline(function ($pipe) use ($currentDriverKey, $rideId, $driverId, $previousDriverId, $ttl) {
            if ($previousDriverId !== null && $previousDriverId !== $driverId) {
                $pipe->srem($this->driverCurrentRidesKey($previousDriverId), (string) $rideId);
            }

            $driverRidesKey = $this->driverCurrentRidesKey($driverId);
            $pipe->setex($currentDriverKey, $ttl, (string) $driverId);
            $pipe->sadd($driverRidesKey, (string) $rideId);
            $pipe->expire($driverRidesKey, $ttl);
        });
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
        $driverId = $this->getCurrentDriver($rideId);

        Redis::del(
            $this->matchingDriversKey($rideId),
            $this->currentDriverKey($rideId),
        );

        if ($driverId !== null) {
            Redis::srem($this->driverCurrentRidesKey($driverId), (string) $rideId);
        }
    }

    public function matchingQueueLength(int $rideId): int
    {
        return (int) Redis::llen($this->matchingDriversKey($rideId));
    }

    /**
     * @return array<int>
     */
    public function currentRideIdsForDriver(int $driverId): array
    {
        return collect(Redis::smembers($this->driverCurrentRidesKey($driverId)))
            ->map(fn ($rideId) => (int) $rideId)
            ->filter()
            ->values()
            ->all();
    }

    private function matchingDriversKey(int $rideId): string
    {
        return self::MATCHING_DRIVERS_PREFIX . $rideId;
    }

    private function currentDriverKey(int $rideId): string
    {
        return self::CURRENT_DRIVER_PREFIX . $rideId;
    }

    private function driverCurrentRidesKey(int $driverId): string
    {
        return self::DRIVER_CURRENT_RIDES_PREFIX . $driverId;
    }
}
