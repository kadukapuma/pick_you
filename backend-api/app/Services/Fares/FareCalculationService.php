<?php

namespace App\Services\Fares;

use App\Models\FareConfig;
use App\Models\Ride;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class FareCalculationService
{
    public function estimate(
        FareConfig $fareConfig,
        float $reportedDistanceKm,
        float $estimatedDurationMinutes,
        ?float $pickupLat = null,
        ?float $pickupLng = null,
        ?float $dropLat = null,
        ?float $dropLng = null,
    ): array {
        $minimumDistanceKm = $this->straightLineDistanceKm($pickupLat, $pickupLng, $dropLat, $dropLng);
        $distanceKm = round(max(0, $reportedDistanceKm, $minimumDistanceKm), 2);
        $durationMinutes = round(max(0, $estimatedDurationMinutes), 2);

        $distanceFare = $distanceKm * (float) $fareConfig->per_km_rate;
        $durationFare = $durationMinutes * (float) $fareConfig->per_minute_rate;
        $estimatedFare = round((float) $fareConfig->base_fare + $distanceFare + $durationFare, 2);

        return [
            'distance_km' => $distanceKm,
            'duration_minutes' => $durationMinutes,
            'estimated_fare' => $estimatedFare,
            'breakdown' => [
                'base_fare' => round((float) $fareConfig->base_fare, 2),
                'distance_fare' => round($distanceFare, 2),
                'duration_fare' => round($durationFare, 2),
                'per_km_rate' => round((float) $fareConfig->per_km_rate, 2),
                'per_minute_rate' => round((float) $fareConfig->per_minute_rate, 2),
            ],
        ];
    }

    public function completionBreakdown(Ride $ride): array
    {
        $ride->loadMissing('fareConfig');

        $estimatedDistanceKm = (float) ($ride->estimated_distance_km ?: $ride->distance_km);
        $actualDistanceKm = $this->actualDistanceKm($ride, $estimatedDistanceKm);
        $actualDurationMinutes = $this->minutesBetween($ride->started_at, $ride->completed_at);
        $waitingMinutes = $this->minutesBetween($ride->arrived_at, $ride->started_at);
        $chargeableWaitingMinutes = round(max(
            0,
            $waitingMinutes - (float) config('ride.waiting_grace_minutes', 5)
        ), 2);

        $extraDistanceKm = round(max(0, $actualDistanceKm - $estimatedDistanceKm), 2);
        $extraDistanceFare = round($extraDistanceKm * (float) $ride->fareConfig->per_km_rate, 2);
        $waitingFare = round($chargeableWaitingMinutes * (float) $ride->fareConfig->per_minute_rate, 2);
        $estimatedFare = round((float) $ride->estimated_fare, 2);
        $finalFare = round(max($estimatedFare, $estimatedFare + $extraDistanceFare + $waitingFare), 2);

        return [
            'estimated_distance_km' => round($estimatedDistanceKm, 2),
            'actual_distance_km' => $actualDistanceKm,
            'actual_duration_minutes' => $actualDurationMinutes,
            'waiting_minutes' => $waitingMinutes,
            'chargeable_waiting_minutes' => $chargeableWaitingMinutes,
            'extra_distance_km' => $extraDistanceKm,
            'extra_distance_fare' => $extraDistanceFare,
            'waiting_fare' => $waitingFare,
            'final_fare' => $finalFare,
            'fare_breakdown' => [
                'policy' => 'estimate_plus_extras',
                'version' => 1,
                'estimated_fare' => $estimatedFare,
                'estimated_distance_km' => round($estimatedDistanceKm, 2),
                'actual_distance_km' => $actualDistanceKm,
                'extra_distance_km' => $extraDistanceKm,
                'extra_distance_fare' => $extraDistanceFare,
                'waiting_minutes' => $waitingMinutes,
                'waiting_grace_minutes' => (float) config('ride.waiting_grace_minutes', 5),
                'chargeable_waiting_minutes' => $chargeableWaitingMinutes,
                'waiting_fare' => $waitingFare,
                'per_km_rate' => round((float) $ride->fareConfig->per_km_rate, 2),
                'per_minute_rate' => round((float) $ride->fareConfig->per_minute_rate, 2),
                'final_fare' => $finalFare,
            ],
        ];
    }

    public function actualDistanceKm(Ride $ride, float $fallbackDistanceKm): float
    {
        if (! $ride->driver_id) {
            return round(max(0, $fallbackDistanceKm), 2);
        }

        $points = $this->rideLocationPoints($ride, true);

        if ($points->count() < 2) {
            $points = $this->rideLocationPoints($ride, false);
        }

        if ($points->count() < 2) {
            return round(max(0, $fallbackDistanceKm), 2);
        }

        $distanceKm = 0.0;
        $previous = null;

        foreach ($points as $point) {
            $latitude = $point->lat ?? null;
            $longitude = $point->lng ?? null;

            if ($latitude === null || $longitude === null) {
                continue;
            }

            if ($previous !== null) {
                $distanceKm += $this->haversineKm(
                    (float) $previous->lat,
                    (float) $previous->lng,
                    (float) $latitude,
                    (float) $longitude,
                );
            }

            $previous = $point;
        }

        return round(max(0, $distanceKm), 2);
    }

    private function rideLocationPoints(Ride $ride, bool $bounded)
    {
        return DB::table('ride_location_points')
            ->where('ride_id', $ride->id)
            ->where('driver_id', $ride->driver_id)
            ->where('accepted_for_fare', true)
            ->when($bounded && $ride->started_at, fn ($query) => $query->where('recorded_at', '>=', $ride->started_at))
            ->when($bounded && $ride->completed_at, fn ($query) => $query->where('recorded_at', '<=', $ride->completed_at))
            ->orderByRaw('sequence IS NULL')
            ->orderBy('sequence')
            ->orderBy('recorded_at')
            ->orderBy('id')
            ->get(['latitude as lat', 'longitude as lng', 'sequence']);
    }

    private function minutesBetween(mixed $start, mixed $end): float
    {
        if (! $start || ! $end) {
            return 0.0;
        }

        if ($start instanceof CarbonInterface && $end instanceof CarbonInterface) {
            return round(max(0, $start->floatDiffInMinutes($end)), 2);
        }

        return round(max(0, strtotime((string) $end) - strtotime((string) $start)) / 60, 2);
    }

    private function straightLineDistanceKm(?float $fromLat, ?float $fromLng, ?float $toLat, ?float $toLng): float
    {
        if ($fromLat === null || $fromLng === null || $toLat === null || $toLng === null) {
            return 0.0;
        }

        return $this->haversineKm($fromLat, $fromLng, $toLat, $toLng);
    }

    private function haversineKm(float $fromLat, float $fromLng, float $toLat, float $toLng): float
    {
        $earthRadiusKm = 6371.0;
        $latDelta = deg2rad($toLat - $fromLat);
        $lngDelta = deg2rad($toLng - $fromLng);

        $a = sin($latDelta / 2) ** 2
            + cos(deg2rad($fromLat)) * cos(deg2rad($toLat)) * sin($lngDelta / 2) ** 2;

        return $earthRadiusKm * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
