<?php

namespace Tests\Feature;

use App\Models\PassengerPaymentMethod;
use App\Models\WebxpayTokenizationOperation;
use App\Services\Payments\WebxpaySavedCardSynchronizer;
use App\Services\Payments\WebxpayTokenizationCallbackProcessor;
use DomainException;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class WebxpayTokenizationCallbackProcessorTest extends TestCase
{
    use BuildsLedgerScenarios, RefreshDatabase;

    public function test_verified_success_reconciles_card_and_completes_once(): void
    {
        [$user, $passenger] = $this->makePassenger();
        [$operation, $token] = $this->operation(
            $passenger->id,
            $user->email
        );
        $method = PassengerPaymentMethod::create([
            'passenger_id' => $passenger->id,
            'gateway' => 'webxpay',
            'token' => 'provider-card-id',
            'brand' => 'visa',
            'last4' => '1111',
            'exp_month' => 12,
            'exp_year' => 2030,
            'is_default' => true,
        ]);

        $this->mock(
            WebxpaySavedCardSynchronizer::class,
            fn (MockInterface $mock) => $mock
                ->shouldReceive('sync')
                ->once()
                ->andReturn(new Collection([$method]))
        );

        $processor = app(WebxpayTokenizationCallbackProcessor::class);
        $encoded = $this->successfulResult(
            $operation,
            'provider-card-id'
        );

        $this->assertSame(
            WebxpayTokenizationOperation::STATUS_COMPLETED,
            $processor->process($operation, $token, $encoded)
        );
        $this->assertSame(
            WebxpayTokenizationOperation::STATUS_COMPLETED,
            $operation->fresh()->status
        );

        $this->assertSame(
            WebxpayTokenizationOperation::STATUS_COMPLETED,
            $processor->process($operation, $token, $encoded)
        );
    }

    public function test_verified_success_retries_temporary_card_reconciliation_delay(): void
    {
        [$user, $passenger] = $this->makePassenger();
        [$operation, $token] = $this->operation(
            $passenger->id,
            $user->email
        );
        $method = PassengerPaymentMethod::create([
            'passenger_id' => $passenger->id,
            'gateway' => 'webxpay',
            'token' => 'provider-card-id',
            'brand' => 'visa',
            'last4' => '1111',
            'exp_month' => 12,
            'exp_year' => 2030,
            'is_default' => true,
        ]);
        $attempt = 0;

        $this->mock(
            WebxpaySavedCardSynchronizer::class,
            function (MockInterface $mock) use ($method, &$attempt) {
                $mock->shouldReceive('sync')
                    ->twice()
                    ->andReturnUsing(function () use ($method, &$attempt) {
                        $attempt++;

                        return $attempt === 1
                            ? new Collection
                            : new Collection([$method]);
                    });
            }
        );

        $status = app(WebxpayTokenizationCallbackProcessor::class)
            ->process(
                $operation,
                $token,
                $this->successfulResult(
                    $operation,
                    'provider-card-id'
                )
            );

        $this->assertSame(
            WebxpayTokenizationOperation::STATUS_COMPLETED,
            $status
        );
        $this->assertSame(2, $attempt);
    }

    public function test_invalid_callback_token_is_rejected_before_sync(): void
    {
        [$user, $passenger] = $this->makePassenger();
        [$operation] = $this->operation(
            $passenger->id,
            $user->email
        );

        $this->mock(
            WebxpaySavedCardSynchronizer::class,
            fn (MockInterface $mock) => $mock->shouldNotReceive('sync')
        );

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage(
            'WEBXPAY tokenization callback token is invalid.'
        );

        app(WebxpayTokenizationCallbackProcessor::class)->process(
            $operation,
            str_repeat('x', 64),
            $this->successfulResult($operation, 'provider-card-id')
        );
    }

    public function test_customer_mismatch_is_rejected(): void
    {
        [$user, $passenger] = $this->makePassenger();
        [$operation, $token] = $this->operation(
            $passenger->id,
            $user->email
        );

        $this->mock(
            WebxpaySavedCardSynchronizer::class,
            fn (MockInterface $mock) => $mock->shouldNotReceive('sync')
        );

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY tokenization customer does not match the operation.'
        );

        app(WebxpayTokenizationCallbackProcessor::class)->process(
            $operation,
            $token,
            $this->encode([
                'success' => true,
                'customer' => [
                    'id' => 'picku-passenger-other',
                    'email' => $operation->customer_email,
                ],
                'card' => ['id' => 'provider-card-id'],
            ])
        );
    }

    public function test_failed_3ds_marks_operation_failed(): void
    {
        [$user, $passenger] = $this->makePassenger();
        [$operation, $token] = $this->operation(
            $passenger->id,
            $user->email
        );

        $this->mock(
            WebxpaySavedCardSynchronizer::class,
            fn (MockInterface $mock) => $mock->shouldNotReceive('sync')
        );

        $status = app(WebxpayTokenizationCallbackProcessor::class)
            ->process(
                $operation,
                $token,
                $this->encode([
                    'success' => false,
                    'customer' => [
                        'id' => $operation->customer_id,
                        'email' => $operation->customer_email,
                    ],
                ])
            );

        $this->assertSame(
            WebxpayTokenizationOperation::STATUS_FAILED,
            $status
        );
        $this->assertSame(
            'THREE_DS_FAILED',
            $operation->fresh()->failure_code
        );
    }

    /**
     * @return array{WebxpayTokenizationOperation, string}
     */
    private function operation(int $passengerId, string $email): array
    {
        $token = str_repeat('a', 64);

        return [
            WebxpayTokenizationOperation::create([
                'passenger_id' => $passengerId,
                'status' => WebxpayTokenizationOperation::STATUS_THREE_DS_REQUIRED,
                'customer_id' => 'picku-passenger-'.$passengerId,
                'customer_email' => $email,
                'callback_token_hash' => hash('sha256', $token),
                'expires_at' => now()->addMinutes(15),
            ]),
            $token,
        ];
    }

    private function successfulResult(
        WebxpayTokenizationOperation $operation,
        string $cardId
    ): string {
        return $this->encode([
            'success' => true,
            'customer' => [
                'id' => $operation->customer_id,
                'email' => $operation->customer_email,
            ],
            'card' => ['id' => $cardId],
        ]);
    }

    /**
     * @param  array<string, mixed>  $value
     */
    private function encode(array $value): string
    {
        return base64_encode(
            json_encode($value, JSON_THROW_ON_ERROR)
        );
    }
}
