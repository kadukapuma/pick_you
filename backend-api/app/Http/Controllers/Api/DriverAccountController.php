<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DriverAccount;
use App\Models\JournalLine;
use App\Models\PaymentAllocation;
use App\Models\Ride;
use App\Services\Ledger\Money;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class DriverAccountController extends Controller
{
    use ApiResponse;

    /** Current signed position: positive means PickU owes the driver. */
    public function show(Request $request)
    {
        $driver = $request->user()->driver;

        if (! $driver) {
            return $this->error('Driver not found', 404);
        }

        $account = DriverAccount::forDriver((int) $driver->id)->load('ledgerAccount');
        $balance = $account->balance();
        $limit = Money::of($account->credit_limit);

        return $this->success([
            'balance' => $balance,
            'status' => $this->statusFor($balance),
            'credit_limit' => $limit,
            'is_blocked' => $account->is_blocked,
            'block_reason' => $account->block_reason,
            'over_credit_limit' => $account->isOverCreditLimit(),
            'can_accept_rides' => $account->canAcceptRides(),
            // Warn before blocking, so the first time a driver hears about the
            // limit isn't when they can no longer work.
            'should_warn' => $this->shouldWarn($balance, $limit),
        ], 'Driver account retrieved successfully.');
    }

    /** Ledger statement for this driver's account. */
    public function transactions(Request $request)
    {
        $driver = $request->user()->driver;

        if (! $driver) {
            return $this->error('Driver not found', 404);
        }

        $account = DriverAccount::forDriver((int) $driver->id);

        $lines = JournalLine::query()
            ->where('ledger_account_id', $account->ledger_account_id)
            ->with('entry:id,type,description,posted_at,reference_type,reference_id')
            ->orderByDesc('id')
            ->paginate(50);

        $lines->getCollection()->transform(fn (JournalLine $line) => [
            'id' => $line->id,
            // Credit increases what PickU owes the driver; debit reduces it.
            'amount' => Money::sub((string) $line->credit, (string) $line->debit),
            'debit' => Money::of($line->debit),
            'credit' => Money::of($line->credit),
            'balance_after' => Money::of($line->balance_after),
            'type' => $line->entry?->type,
            'description' => $line->entry?->description,
            'posted_at' => optional($line->entry?->posted_at)?->toDateTimeString(),
        ]);

        return $this->success($lines, 'Driver account transactions retrieved successfully.');
    }

    /** Powers the driver app EarningScreen. */
    public function earnings(Request $request)
    {
        $driver = $request->user()->driver;

        if (! $driver) {
            return $this->error('Driver not found', 404);
        }

        $validated = $request->validate([
            'period' => 'sometimes|in:day,week,month',
        ]);

        $period = $validated['period'] ?? 'day';
        $since = match ($period) {
            'week' => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            default => now()->startOfDay(),
        };

        $rides = Ride::query()
            ->with('payment.allocations')
            ->where('driver_id', $driver->id)
            ->where('status', 'COMPLETED')
            ->where('completed_at', '>=', $since)
            ->get([
                'id',
                'final_fare', 'estimated_fare', 'commission_amount',
                'driver_earning', 'payment_method', 'completed_at',
            ]);

        $gross = '0.00';
        $commission = '0.00';
        $net = '0.00';
        $cashCollected = '0.00';
        $buckets = $this->emptyBuckets($period);

        foreach ($rides as $ride) {
            $rideGross = Money::isZero(Money::of($ride->final_fare))
                ? Money::of($ride->estimated_fare)
                : Money::of($ride->final_fare);

            $gross = Money::add($gross, $rideGross);
            $commission = Money::add($commission, Money::of($ride->commission_amount));
            // Pre-cutoff rides have no commission recorded, so the driver kept the lot.
            $rideNet = $ride->driver_earning === null ? $rideGross : Money::of($ride->driver_earning);
            $net = Money::add($net, $rideNet);

            $completedAllocations = $ride->payment?->allocations
                ?->where('status', PaymentAllocation::STATUS_COMPLETED);

            if ($completedAllocations?->isNotEmpty()) {
                foreach ($completedAllocations->where('type', PaymentAllocation::TYPE_CASH) as $allocation) {
                    $cashCollected = Money::add(
                        $cashCollected,
                        Money::of($allocation->amount)
                    );
                }
            } elseif (($ride->payment_method ?: 'cash') === 'cash') {
                $cashCollected = Money::add(
                    $cashCollected,
                    $rideGross
                );
            }

            $key = $this->bucketKeyFor($period, $ride->completed_at);

            if ($key !== null && isset($buckets[$key])) {
                $buckets[$key] = Money::add($buckets[$key], $rideNet);
            }
        }

        $rideCount = $rides->count();

        return $this->success([
            'period' => $period,
            'since' => $since->toDateTimeString(),
            'ride_count' => $rideCount,
            'gross' => $gross,
            'commission' => $commission,
            'net' => $net,
            'cash_collected' => $cashCollected,
            'average_per_trip' => $rideCount > 0
                ? Money::round(bcdiv($net, (string) $rideCount, 8))
                : '0.00',
            'rating' => (string) ($driver->rating ?? 0),
            // Net earnings per bucket, for the chart.
            'chart' => collect($buckets)
                ->map(fn (string $amount, string $label) => ['label' => $label, 'amount' => (float) $amount])
                ->values(),
        ], 'Driver earnings retrieved successfully.');
    }

    /**
     * Pre-seed every bucket so the chart keeps a stable shape on quiet days
     * instead of collapsing to one bar.
     *
     * @return array<string, string>
     */
    private function emptyBuckets(string $period): array
    {
        $labels = match ($period) {
            'week' => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            'month' => ['W1', 'W2', 'W3', 'W4', 'W5'],
            default => ['00', '04', '08', '12', '16', '20'],
        };

        return array_fill_keys($labels, '0.00');
    }

    private function bucketKeyFor(string $period, mixed $completedAt): ?string
    {
        if (! $completedAt) {
            return null;
        }

        return match ($period) {
            'week' => $completedAt->format('D'),
            'month' => 'W'.(int) ceil($completedAt->day / 7),
            // Group the day into 4-hour blocks matching the seeded labels.
            default => str_pad((string) (intdiv($completedAt->hour, 4) * 4), 2, '0', STR_PAD_LEFT),
        };
    }

    private function statusFor(string $balance): string
    {
        return match (true) {
            Money::isZero($balance) => 'SETTLED',
            Money::isNegative($balance) => 'OWING',   // driver owes PickU
            default => 'OWED',                        // PickU owes driver
        };
    }

    private function shouldWarn(string $balance, string $limit): bool
    {
        if (! Money::isNegative($balance)) {
            return false;
        }

        $threshold = Money::mul($limit, (string) config('commission.warn_at_fraction', 0.75));

        return Money::cmp($balance, $threshold) <= 0;
    }
}
