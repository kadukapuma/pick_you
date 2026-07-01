<?php

namespace App\Services\Locations;

use App\Models\Ride;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class RideLocationPointProcessor
{
    public function process(array $payload): void
    {
        $recordedAt = CarbonImmutable::parse($payload['recorded_at'])->utc();
        $now = CarbonImmutable::now('UTC');
        $sequence = isset($payload['sequence']) ? (int) $payload['sequence'] : null;

        DB::transaction(function () use ($payload, $recordedAt, $now, $sequence) {
            $ride = Ride::query()->lockForUpdate()->find($payload['ride_id']);

            if (! $ride || (int) $ride->driver_id !== (int) $payload['driver_id']) {
                $this->storePoint($payload, $recordedAt, 0, false, 'ride_driver_mismatch', $now);
                return;
            }

            $duplicate = DB::table('ride_location_points')
                ->where('ride_id', $ride->id)
                ->where('driver_id', $ride->driver_id)
                ->when($sequence !== null, fn ($query) => $query->where('sequence', $sequence))
                ->when($sequence === null, fn ($query) => $query->where('recorded_at', $recordedAt))
                ->exists();

            if ($duplicate) {
                return;
            }

            [$accepted, $reason] = $this->validateRideLifecycle($ride, $recordedAt);

            if ($accepted && $payload['accuracy'] !== null && (float) $payload['accuracy'] > config('location.max_fare_accuracy_meters', 100)) {
                [$accepted, $reason] = [false, 'poor_accuracy'];
            }

            if ($accepted && $sequence !== null && $ride->last_processed_location_sequence !== null && $sequence <= (int) $ride->last_processed_location_sequence) {
                [$accepted, $reason] = [false, 'late_or_duplicate_sequence'];
            }

            $previous = $accepted ? $this->previousAcceptedPoint($ride) : null;
            $distanceKm = 0.0;

            if ($accepted && $previous) {
                $distanceKm = $this->haversineKm(
                    (float) $previous->latitude,
                    (float) $previous->longitude,
                    (float) $payload['latitude'],
                    (float) $payload['longitude'],
                );

                $seconds = max(1, abs($recordedAt->diffInSeconds(CarbonImmutable::parse($previous->recorded_at), false)));
                $kmh = $distanceKm / ($seconds / 3600);

                if ($distanceKm > config('location.max_point_jump_km', 2.0) || $kmh > config('location.max_plausible_speed_kmh', 160)) {
                    [$accepted, $reason, $distanceKm] = [false, 'impossible_jump', 0.0];
                }
            }

            $this->storePoint($payload, $recordedAt, $distanceKm, $accepted, $reason, $now);

            if ($accepted) {
                $this->incrementRideDistance($ride, $distanceKm, $sequence, $recordedAt);
            }
        });
    }

    public function replay(Ride $ride): array
    {
        $ride->loadMissing('fareConfig');

        $points = DB::table('ride_location_points')
            ->where('ride_id', $ride->id)
            ->where('driver_id', $ride->driver_id)
            ->where('accepted_for_fare', true)
            ->when($ride->started_at, fn ($query) => $query->where('recorded_at', '>=', $ride->started_at))
            ->when($ride->completed_at, fn ($query) => $query->where('recorded_at', '<=', $ride->completed_at))
            ->orderByRaw('sequence IS NULL')
            ->orderBy('sequence')
            ->orderBy('recorded_at')
            ->get();

        $distanceKm = 0.0;
        $previous = null;

        foreach ($points as $point) {
            if ($previous) {
                $distanceKm += $this->haversineKm(
                    (float) $previous->latitude,
                    (float) $previous->longitude,
                    (float) $point->latitude,
                    (float) $point->longitude,
                );
            }

            $previous = $point;
        }

        $actualDistanceKm = round($distanceKm, 4);
        $estimatedDistanceKm = (float) ($ride->estimated_distance_km ?: $ride->distance_km);
        $waitingMinutes = $this->minutesBetween($ride->arrived_at, $ride->started_at);
        $chargeableWaitingMinutes = round(max(
            0,
            $waitingMinutes - (float) config('ride.waiting_grace_minutes', 5)
        ), 2);
        $extraDistanceKm = round(max(0, $actualDistanceKm - $estimatedDistanceKm), 4);
        $extraDistanceFare = round($extraDistanceKm * (float) $ride->fareConfig->per_km_rate, 2);
        $waitingFare = round($chargeableWaitingMinutes * (float) $ride->fareConfig->per_minute_rate, 2);
        $estimatedFare = round((float) $ride->estimated_fare, 2);
        $finalFare = round(max($estimatedFare, $estimatedFare + $extraDistanceFare + $waitingFare), 2);

        return [
            'ride_id' => (int) $ride->id,
            'accepted_point_count' => $points->count(),
            'actual_distance_km' => $actualDistanceKm,
            'stored_actual_distance_km' => round((float) $ride->actual_distance_km, 4),
            'distance_delta_km' => round($distanceKm - (float) $ride->actual_distance_km, 4),
            'extra_distance_km' => $extraDistanceKm,
            'extra_distance_fare' => $extraDistanceFare,
            'waiting_minutes' => $waitingMinutes,
            'chargeable_waiting_minutes' => $chargeableWaitingMinutes,
            'waiting_fare' => $waitingFare,
            'final_fare' => $finalFare,
            'stored_final_fare' => round((float) $ride->final_fare, 2),
            'final_fare_delta' => round($finalFare - (float) $ride->final_fare, 2),
            'fare_calculation_version' => (int) ($ride->fare_calculation_version ?? 1),
        ];
    }

    private function validateRideLifecycle(Ride $ride, CarbonImmutable $recordedAt): array
    {
        if (! in_array($ride->status, ['ACCEPTED', 'ARRIVED', 'STARTED'], true)) {
            return [false, 'ride_not_active'];
        }

        if ($ride->started_at && $recordedAt->lt($ride->started_at)) {
            return [false, 'before_trip_started'];
        }

        if ($ride->completed_at && $recordedAt->gt($ride->completed_at)) {
            return [false, 'after_trip_completed'];
        }

        return [$ride->status === 'STARTED', $ride->status === 'STARTED' ? null : 'before_trip_started'];
    }

    private function previousAcceptedPoint(Ride $ride): ?object
    {
        return DB::table('ride_location_points')
            ->where('ride_id', $ride->id)
            ->where('driver_id', $ride->driver_id)
            ->where('accepted_for_fare', true)
            ->orderByDesc('sequence')
            ->orderByDesc('recorded_at')
            ->first();
    }

    private function storePoint(
        array $payload,
        CarbonImmutable $recordedAt,
        float $distanceKm,
        bool $accepted,
        ?string $reason,
        CarbonImmutable $now,
    ): void {
        DB::table('ride_location_points')->insert([
            'ride_id' => $payload['ride_id'],
            'driver_id' => $payload['driver_id'],
            'latitude' => $payload['latitude'],
            'longitude' => $payload['longitude'],
            'accuracy' => $payload['accuracy'],
            'speed' => $payload['speed'],
            'heading' => $payload['heading'],
            'recorded_at' => $recordedAt,
            'sequence' => $payload['sequence'],
            'distance_from_previous_km' => round($distanceKm, 6),
            'accepted_for_fare' => $accepted,
            'rejection_reason' => $reason,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function incrementRideDistance(Ride $ride, float $distanceKm, ?int $sequence, CarbonImmutable $recordedAt): void
    {
        $newDistanceKm = round((float) $ride->actual_distance_km + $distanceKm, 4);
        $estimatedDistanceKm = (float) ($ride->estimated_distance_km ?: $ride->distance_km);
        $extraDistanceKm = round(max(0, $newDistanceKm - $estimatedDistanceKm), 4);
        $perKmRate = (float) optional($ride->fareConfig)->per_km_rate;
        $extraDistanceFare = round($extraDistanceKm * $perKmRate, 2);
        $waitingFare = (float) $ride->waiting_fare;
        $estimatedFare = (float) $ride->estimated_fare;

        $ride->update([
            'actual_distance_km' => $newDistanceKm,
            'extra_distance_km' => $extraDistanceKm,
            'extra_distance_fare' => $extraDistanceFare,
            'final_fare' => round(max($estimatedFare, $estimatedFare + $extraDistanceFare + $waitingFare), 2),
            'last_processed_location_sequence' => $sequence,
            'last_processed_location_recorded_at' => $recordedAt,
        ]);
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
}
