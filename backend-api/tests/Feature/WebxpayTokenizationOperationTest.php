<?php

namespace Tests\Feature;

use App\Models\WebxpayTokenizationOperation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class WebxpayTokenizationOperationTest extends TestCase
{
    use BuildsLedgerScenarios, RefreshDatabase;

    public function test_operation_tracks_the_add_card_lifecycle(): void
    {
        [$user, $passenger] = $this->makePassenger();

        $operation = WebxpayTokenizationOperation::create([
            'passenger_id' => $passenger->id,
            'status' => WebxpayTokenizationOperation::STATUS_INITIATED,
            'customer_id' => 'picku-passenger-'.$passenger->id,
            'customer_email' => $user->email,
            'expires_at' => now()->addMinutes(15),
        ]);

        $this->assertTrue(Str::isUuid($operation->id));
        $this->assertTrue($operation->canAcceptSession());

        $operation->markThreeDsRequired();

        $this->assertSame(
            WebxpayTokenizationOperation::STATUS_THREE_DS_REQUIRED,
            $operation->status
        );
        $this->assertFalse($operation->canAcceptSession());

        $operation->markCompleted();
        $firstCompletedAt = $operation->completed_at;
        $operation->markCompleted();

        $this->assertSame(
            WebxpayTokenizationOperation::STATUS_COMPLETED,
            $operation->status
        );
        $this->assertTrue(
            $firstCompletedAt->equalTo($operation->completed_at)
        );
    }

    public function test_expired_operation_cannot_accept_a_session(): void
    {
        [$user, $passenger] = $this->makePassenger();

        $operation = WebxpayTokenizationOperation::create([
            'passenger_id' => $passenger->id,
            'status' => WebxpayTokenizationOperation::STATUS_INITIATED,
            'customer_id' => 'picku-passenger-'.$passenger->id,
            'customer_email' => $user->email,
            'expires_at' => now()->subSecond(),
        ]);

        $this->assertTrue($operation->isExpired());
        $this->assertFalse($operation->canAcceptSession());
    }

    public function test_failed_operation_records_only_a_safe_reason(): void
    {
        [$user, $passenger] = $this->makePassenger();

        $operation = WebxpayTokenizationOperation::create([
            'passenger_id' => $passenger->id,
            'status' => WebxpayTokenizationOperation::STATUS_INITIATED,
            'customer_id' => 'picku-passenger-'.$passenger->id,
            'customer_email' => $user->email,
            'expires_at' => now()->addMinutes(15),
        ]);

        $operation->markFailed(
            'PROVIDER_ERROR',
            'Card setup could not be completed.'
        );

        $this->assertSame(
            WebxpayTokenizationOperation::STATUS_FAILED,
            $operation->status
        );
        $this->assertSame('PROVIDER_ERROR', $operation->failure_code);
        $this->assertSame(
            'Card setup could not be completed.',
            $operation->failure_reason
        );
        $this->assertNotNull($operation->completed_at);
    }
}
