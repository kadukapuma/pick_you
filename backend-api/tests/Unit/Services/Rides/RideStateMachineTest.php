<?php

namespace Tests\Unit\Services\Rides;

use App\Services\Rides\RideStateMachine;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class RideStateMachineTest extends TestCase
{
    #[DataProvider('allowedTransitions')]
    public function test_allows_valid_transitions(string $from, string $to): void
    {
        $stateMachine = new RideStateMachine;

        $this->assertTrue($stateMachine->canTransition($from, $to));
    }

    #[DataProvider('rejectedTransitions')]
    public function test_rejects_invalid_transitions(string $from, string $to): void
    {
        $stateMachine = new RideStateMachine;

        $this->assertFalse($stateMachine->canTransition($from, $to));
    }

    public static function allowedTransitions(): array
    {
        return [
            'request accepted' => ['REQUESTED', 'ACCEPTED'],
            'request cancelled' => ['REQUESTED', 'CANCELLED'],
            'accepted started' => ['ACCEPTED', 'STARTED'],
            'accepted cancelled' => ['ACCEPTED', 'CANCELLED'],
            'started completed' => ['STARTED', 'COMPLETED'],
        ];
    }

    public static function rejectedTransitions(): array
    {
        return [
            'request completed' => ['REQUESTED', 'COMPLETED'],
            'accepted completed' => ['ACCEPTED', 'COMPLETED'],
            'started cancelled' => ['STARTED', 'CANCELLED'],
            'completed restarted' => ['COMPLETED', 'STARTED'],
            'cancelled accepted' => ['CANCELLED', 'ACCEPTED'],
            'unknown state' => ['UNKNOWN', 'REQUESTED'],
        ];
    }
}
