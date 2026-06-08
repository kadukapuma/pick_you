<?php

namespace App\Services\RideMatching;

use Illuminate\Support\Facades\Redis;

class DriverRejectionCooldown
{
    private const KEY_PREFIX = 'driver:rejection_cooldown:';

    public function record(int $driverId): void
    {
        $ttl = (int) config('ride.rejection_cooldown_seconds', 300);

        Redis::setex($this->key($driverId), $ttl, '1');
    }

    public function isOnCooldown(int $driverId): bool
    {
        return (bool) Redis::exists($this->key($driverId));
    }

    /**
     * @param  array<int>  $driverIds
     * @return array<int>
     */
    public function filterCooledDown(array $driverIds): array
    {
        if ($driverIds === []) {
            return [];
        }

        $keys = array_map(fn (int $id) => $this->key($id), $driverIds);

        $exists = Redis::pipeline(function ($pipe) use ($keys) {
            foreach ($keys as $key) {
                $pipe->exists($key);
            }
        });

        $cooledDown = [];

        foreach ($driverIds as $index => $driverId) {
            if (! empty($exists[$index])) {
                $cooledDown[] = $driverId;
            }
        }

        return $cooledDown;
    }

    private function key(int $driverId): string
    {
        return self::KEY_PREFIX . $driverId;
    }
}
