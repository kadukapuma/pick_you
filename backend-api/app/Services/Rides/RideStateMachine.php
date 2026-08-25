<?php

namespace App\Services\Rides;

class RideStateMachine
{
    public const REQUESTED = 'REQUESTED';

    public const ACCEPTED = 'ACCEPTED';

    public const ARRIVED = 'ARRIVED';

    public const STARTED = 'STARTED';

    // Return trips only. Driver marks arrival at the destination (STARTED ->
    // WAITING), then either starts the return leg (WAITING -> RETURNING) or
    // the ride completes directly from WAITING - an early end at the
    // destination, billed only for the outbound distance (see
    // FareCalculationService::completionBreakdown()).
    public const WAITING = 'WAITING';

    public const RETURNING = 'RETURNING';

    public const COMPLETED = 'COMPLETED';

    public const CANCELLED = 'CANCELLED';

    private const ALLOWED_TRANSITIONS = [
        self::REQUESTED => [self::ACCEPTED, self::CANCELLED],
        self::ACCEPTED => [self::ARRIVED, self::CANCELLED],
        self::ARRIVED => [self::STARTED, self::CANCELLED],
        self::STARTED => [self::COMPLETED, self::WAITING],
        self::WAITING => [self::RETURNING, self::COMPLETED],
        self::RETURNING => [self::COMPLETED],
        self::COMPLETED => [],
        self::CANCELLED => [],
    ];

    public function canTransition(string $from, string $to): bool
    {
        return in_array($to, self::ALLOWED_TRANSITIONS[$from] ?? [], true);
    }
}
