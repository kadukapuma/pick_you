<?php

namespace App\Services\Rides;

class RideStateMachine
{
    public const REQUESTED = 'REQUESTED';

    public const ACCEPTED = 'ACCEPTED';

    public const STARTED = 'STARTED';

    public const COMPLETED = 'COMPLETED';

    public const CANCELLED = 'CANCELLED';

    private const ALLOWED_TRANSITIONS = [
        self::REQUESTED => [self::ACCEPTED, self::CANCELLED],
        self::ACCEPTED => [self::STARTED, self::CANCELLED],
        self::STARTED => [self::COMPLETED],
        self::COMPLETED => [],
        self::CANCELLED => [],
    ];

    public function canTransition(string $from, string $to): bool
    {
        return in_array($to, self::ALLOWED_TRANSITIONS[$from] ?? [], true);
    }
}
