<?php

namespace App\Services\Ledger;

use App\Models\DriverAccount;
use App\Models\Ride;
use App\Models\Setting;
use Carbon\CarbonInterface;

class CommissionService
{
    /**
     * Resolution order: per-driver override, then per-vehicle-type, then the
     * global setting, then the config default.
     */
    public function rateFor(Ride $ride): string
    {
        if ($ride->driver_id) {
            $driverAccount = DriverAccount::query()->where('driver_id', $ride->driver_id)->first();

            if ($driverAccount?->commission_rate !== null) {
                return $this->normaliseRate($driverAccount->commission_rate);
            }
        }

        $vehicleTypeRate = $ride->fareConfig?->commission_rate;

        if ($vehicleTypeRate !== null) {
            return $this->normaliseRate($vehicleTypeRate);
        }

        return $this->normaliseRate(
            Setting::getSetting('commission_rate', config('commission.default_rate', '0.06'))
        );
    }

    /**
     * Commission base is always the amount actually charged to the passenger.
     * Mirrors the fallback in PaymentController so both agree on the gross.
     */
    public function grossFor(Ride $ride): string
    {
        $final = Money::of($ride->final_fare);

        return Money::isZero($final) ? Money::of($ride->estimated_fare) : $final;
    }

    /**
     * @return array{rate: string, gross: string, commission: string, driver_earning: string}
     */
    public function computeFor(Ride $ride, ?string $gross = null): array
    {
        $gross ??= $this->grossFor($ride);
        $rate = $this->rateFor($ride);

        $commission = Money::mul($gross, $rate);

        return [
            'rate' => $rate,
            'gross' => $gross,
            'commission' => $commission,
            // Derived by subtraction, never computed independently, so the two
            // halves always sum back to gross with no stray cent.
            'driver_earning' => Money::sub($gross, $commission),
        ];
    }

    /**
     * Rides completed before the cutoff never accrue commission - the no-backfill
     * decision. Absent setting means "commission has always applied".
     */
    public function appliesTo(Ride $ride): bool
    {
        $cutoff = Setting::getSetting('commission_effective_from');

        if (! $cutoff) {
            return true;
        }

        $completedAt = $ride->completed_at;

        if (! $completedAt instanceof CarbonInterface) {
            return true;
        }

        return $completedAt->greaterThanOrEqualTo(\Illuminate\Support\Carbon::parse($cutoff));
    }

    private function normaliseRate(mixed $rate): string
    {
        return bcadd((string) $rate, '0', 4);
    }
}
