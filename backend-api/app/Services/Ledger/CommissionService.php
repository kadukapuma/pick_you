<?php

namespace App\Services\Ledger;

use App\Models\DriverAccount;
use App\Models\FareConfig;
use App\Models\Ride;
use App\Models\Setting;
use Carbon\CarbonInterface;

class CommissionService
{
    /**
     * Resolution order: per-driver override, then per-vehicle-type, then the
     * global setting, then the config default.
     *
     * Verified students are a separate track entirely: their rate always
     * comes from the fare config's student_commission_rate (0% if the admin
     * hasn't set one for that vehicle type yet), never the normal chain
     * below - so a driver override or the global setting can't override it.
     */
    public function rateFor(Ride $ride): string
    {
        $passenger = $ride->passenger()->with('studentVerification')->first();

        if ($passenger?->isVerifiedStudent()) {
            return $this->normaliseRate($ride->fareConfig?->student_commission_rate ?? '0');
        }

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
     * The commission rate that would apply if this fare config's ride were
     * NOT a student ride - vehicle-type rate, then global setting, then the
     * config default. Deliberately skips the driver-override step since this
     * is used for the passenger-facing student fare adjustment below, which
     * happens before a driver is even matched.
     */
    public function normalRateForConfig(?FareConfig $fareConfig): string
    {
        $vehicleTypeRate = $fareConfig?->commission_rate;

        if ($vehicleTypeRate !== null) {
            return $this->normaliseRate($vehicleTypeRate);
        }

        return $this->normaliseRate(
            Setting::getSetting('commission_rate', config('commission.default_rate', '0.06'))
        );
    }

    /**
     * The fare a verified student actually sees and pays: the normal
     * commission rate is taken off as a discount, then the student
     * commission rate is added back on - the gap between the two rates is
     * the passenger's real savings. student_commission_rate is what PickU
     * still takes as commission on this ride (see rateFor()).
     *
     * fare=100, normal=10%, student=5% -> 100 - 10 + 5 = 95.
     */
    public function studentAdjustedFare(string $fare, FareConfig $fareConfig): string
    {
        $normalRate = $this->normalRateForConfig($fareConfig);
        $studentRate = $this->normaliseRate($fareConfig->student_commission_rate ?? '0');

        $discount = Money::mul($fare, $normalRate);
        $addition = Money::mul($fare, $studentRate);

        return Money::add(Money::sub($fare, $discount), $addition);
    }

    /**
     * Fraction of the commission actually charged that is credited back to
     * the passenger as loyalty points. Applies to every passenger, including
     * verified students - deliberately independent of the student-only track
     * above, so it stacks with whatever a student already earns there.
     *
     * Resolution: per-vehicle-type (fare_configs.loyalty_points_rate), then
     * the global 'loyalty_points_rate' setting, then the config default (0 -
     * no accrual until an admin configures a rate). No per-driver override -
     * loyalty points are a passenger benefit, not a driver-negotiated term.
     */
    public function loyaltyPointsRateFor(Ride $ride): string
    {
        $vehicleTypeRate = $ride->fareConfig?->loyalty_points_rate;

        if ($vehicleTypeRate !== null) {
            return $this->normaliseRate($vehicleTypeRate);
        }

        return $this->normaliseRate(
            Setting::getSetting('loyalty_points_rate', config('commission.default_loyalty_points_rate', '0'))
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
