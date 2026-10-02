<?php

namespace Tests\Feature;

use App\Models\PassengerPaymentMethod;
use App\Models\WebxpayTokenizationOperation;
use App\Services\Payments\WebxpaySavedCardSynchronizer;
use App\Services\Payments\WebxpayTokenizationCallbackProcessor;
use App\Services\Payments\WebxpayTokenizationClient;
use App\Services\Payments\WebxpayTokenizedCard;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class WebxpayCardOwnershipTest extends TestCase
{
    use BuildsLedgerScenarios, RefreshDatabase;

    public function test_sync_keeps_shared_provider_tokens_separate_and_repeat_sync_is_idempotent(): void
    {
        [, $firstPassenger] = $this->makePassenger();
        [$secondUser, $secondPassenger] = $this->makePassenger('0771234568');
        $firstCard = $this->existingCard($firstPassenger->id);
        $original = $firstCard->fresh()->getRawOriginal();

        $this->mock(WebxpayTokenizationClient::class, function (MockInterface $mock) use ($secondUser, $secondPassenger) {
            $mock->shouldReceive('cards')
                ->twice()
                ->with('picku-passenger-'.$secondPassenger->id, $secondUser->email)
                ->andReturn([
                    new WebxpayTokenizedCard('shared-provider-token', 'VISA', '1111', 10, 2031),
                ]);
        });

        $synchronizer = app(WebxpaySavedCardSynchronizer::class);
        $methods = $synchronizer->sync($secondPassenger);

        $this->assertSame($original, $firstCard->fresh()->getRawOriginal(), 'Sync changed another passenger\'s card.');
        $this->assertCount(1, $methods);
        $secondCard = $methods->sole();
        $this->assertSame($secondPassenger->id, $secondCard->passenger_id);
        $this->assertNotSame($firstCard->id, $secondCard->id);
        $this->assertSame(10, $secondCard->exp_month);
        $this->assertTrue($secondCard->is_default);

        $this->assertSame($secondCard->id, $synchronizer->sync($secondPassenger)->sole()->id);
        $this->assertSame($original, $firstCard->fresh()->getRawOriginal());
        $this->assertDatabaseCount('passenger_payment_methods', 2);
    }

    public function test_successful_callback_reconciles_shared_token_for_its_own_passenger(): void
    {
        [, $firstPassenger] = $this->makePassenger();
        [$secondUser, $secondPassenger] = $this->makePassenger('0771234568');
        $firstCard = $this->existingCard($firstPassenger->id);
        $original = $firstCard->fresh()->getRawOriginal();
        $callbackToken = str_repeat('a', 64);
        $operation = WebxpayTokenizationOperation::create([
            'passenger_id' => $secondPassenger->id,
            'status' => WebxpayTokenizationOperation::STATUS_THREE_DS_REQUIRED,
            'customer_id' => 'picku-passenger-'.$secondPassenger->id,
            'customer_email' => $secondUser->email,
            'callback_token_hash' => hash('sha256', $callbackToken),
            'expires_at' => now()->addMinutes(15),
        ]);

        $this->mock(WebxpayTokenizationClient::class, function (MockInterface $mock) use ($secondUser, $secondPassenger) {
            $mock->shouldReceive('cards')
                ->with('picku-passenger-'.$secondPassenger->id, $secondUser->email)
                ->andReturn([
                    new WebxpayTokenizedCard('shared-provider-token', 'VISA', '1111', 10, 2031),
                ]);
        });

        $result = base64_encode(json_encode([
            'success' => true,
            'customer' => ['id' => $operation->customer_id, 'email' => $operation->customer_email],
            'card' => ['id' => 'shared-provider-token'],
        ], JSON_THROW_ON_ERROR));

        $processor = app(WebxpayTokenizationCallbackProcessor::class);
        $this->assertSame(WebxpayTokenizationOperation::STATUS_COMPLETED, $processor->process($operation, $callbackToken, $result));
        $this->assertSame(WebxpayTokenizationOperation::STATUS_COMPLETED, $operation->fresh()->status);
        $this->assertSame(WebxpayTokenizationOperation::STATUS_COMPLETED, $processor->process($operation, $callbackToken, $result));
        $this->assertSame($original, $firstCard->fresh()->getRawOriginal());
        $this->assertDatabaseHas('passenger_payment_methods', [
            'passenger_id' => $secondPassenger->id,
            'gateway' => 'webxpay',
            'token' => 'shared-provider-token',
        ]);
        $this->assertDatabaseCount('passenger_payment_methods', 2);
    }

    public function test_migration_preserves_existing_card_ids_and_metadata(): void
    {
        [, $passenger] = $this->makePassenger();
        $card = $this->existingCard($passenger->id);
        $original = $card->fresh()->getRawOriginal();
        $migration = require database_path('migrations/2026_09_17_090000_scope_saved_card_tokens_to_passengers.php');

        $migration->down();
        $migration->up();

        $this->assertSame($original, $card->fresh()->getRawOriginal());
        $this->assertDatabaseCount('passenger_payment_methods', 1);
    }

    public function test_rollback_refuses_to_merge_cards_belonging_to_different_passengers(): void
    {
        [, $firstPassenger] = $this->makePassenger();
        [, $secondPassenger] = $this->makePassenger('0771234568');
        $firstCard = $this->existingCard($firstPassenger->id);
        $secondCard = $this->existingCard($secondPassenger->id);
        $migration = require database_path('migrations/2026_09_17_090000_scope_saved_card_tokens_to_passengers.php');

        try {
            $migration->down();
            $this->fail('Rollback must refuse to collapse different passengers\' cards.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('Cannot restore global card-token uniqueness', $exception->getMessage());
        }

        $this->assertSame($firstPassenger->id, $firstCard->fresh()->passenger_id);
        $this->assertSame($secondPassenger->id, $secondCard->fresh()->passenger_id);
        $this->assertDatabaseCount('passenger_payment_methods', 2);
    }

    public function test_same_passenger_cannot_have_duplicate_gateway_tokens(): void
    {
        [, $passenger] = $this->makePassenger();
        $this->existingCard($passenger->id);

        $this->expectException(QueryException::class);
        $this->existingCard($passenger->id);
    }

    private function existingCard(int $passengerId): PassengerPaymentMethod
    {
        return PassengerPaymentMethod::create([
            'passenger_id' => $passengerId,
            'gateway' => 'webxpay',
            'token' => 'shared-provider-token',
            'brand' => 'visa',
            'last4' => '1111',
            'exp_month' => 12,
            'exp_year' => 2030,
            'is_default' => true,
        ]);
    }
}
