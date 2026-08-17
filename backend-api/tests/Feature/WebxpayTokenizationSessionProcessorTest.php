<?php

namespace Tests\Feature;

use App\Models\WebxpayTokenizationOperation;
use App\Services\Payments\WebxpaySaveCardResult;
use App\Services\Payments\WebxpaySavedCardSynchronizer;
use App\Services\Payments\WebxpayTokenizationClient;
use App\Services\Payments\WebxpayTokenizationSessionProcessor;
use DomainException;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class WebxpayTokenizationSessionProcessorTest extends TestCase
{
    use BuildsLedgerScenarios, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set([
            'app.url' => 'https://api.picku.test',
            'payments.webxpay.tokenization.bank_mid' => 'TESTWEBXPATOKLKR',
        ]);
    }

    public function test_it_claims_session_once_and_records_3ds_requirement(): void
    {
        [$user, $passenger] = $this->makePassenger();
        $operation = $this->operation($passenger->id, $user->email);

        $this->mock(
            WebxpayTokenizationClient::class,
            function (MockInterface $mock) use ($operation, $user) {
                $mock->shouldReceive('saveCard')
                    ->once()
                    ->withArgs(function (
                        string $sessionId,
                        string $bankMid,
                        string $returnUrl,
                        array $customer
                    ) use ($operation, $user) {
                        $this->assertSame(
                            'SESSION0002407982678H6120461N79',
                            $sessionId
                        );
                        $this->assertSame('TESTWEBXPATOKLKR', $bankMid);
                        $this->assertStringStartsWith(
                            'https://api.picku.test/payments/webxpay/cards/'
                                .$operation->id.'/return?token=',
                            $returnUrl
                        );
                        $this->assertSame($operation->customer_id, $customer['id']);
                        $this->assertSame($user->email, $customer['email']);
                        $this->assertSame('Kandy', $customer['city']);

                        return true;
                    })
                    ->andReturn(WebxpaySaveCardResult::threeDsRequired(
                        'https://tokenize.test/3ds/challenge-id'
                    ));
            }
        );
        $this->mock(
            WebxpaySavedCardSynchronizer::class,
            fn (MockInterface $mock) => $mock->shouldNotReceive('sync')
        );

        $result = app(WebxpayTokenizationSessionProcessor::class)
            ->process(
                operation: $operation,
                sessionId: 'SESSION0002407982678H6120461N79',
                billing: $this->billing()
            );

        $operation->refresh();

        $this->assertTrue($result->requiresThreeDs());
        $this->assertSame(
            WebxpayTokenizationOperation::STATUS_THREE_DS_REQUIRED,
            $operation->status
        );
        $this->assertMatchesRegularExpression(
            '/^[a-f0-9]{64}$/',
            $operation->getRawOriginal('callback_token_hash')
        );

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage(
            'WEBXPAY card setup is no longer available.'
        );

        app(WebxpayTokenizationSessionProcessor::class)->process(
            operation: $operation,
            sessionId: 'SESSION0002407982678H6120461N79',
            billing: $this->billing()
        );
    }

    public function test_immediate_success_synchronizes_cards_and_completes(): void
    {
        [$user, $passenger] = $this->makePassenger();
        $operation = $this->operation($passenger->id, $user->email);

        $this->mock(
            WebxpayTokenizationClient::class,
            fn (MockInterface $mock) => $mock
                ->shouldReceive('saveCard')
                ->once()
                ->andReturn(WebxpaySaveCardResult::completed())
        );
        $this->mock(
            WebxpaySavedCardSynchronizer::class,
            fn (MockInterface $mock) => $mock
                ->shouldReceive('sync')
                ->once()
                ->withArgs(fn ($value) => $value->is($passenger))
                ->andReturn(new Collection)
        );

        $result = app(WebxpayTokenizationSessionProcessor::class)
            ->process(
                operation: $operation,
                sessionId: 'SESSION0002407982678H6120461N79',
                billing: $this->billing()
            );

        $this->assertTrue($result->completed);
        $this->assertSame(
            WebxpayTokenizationOperation::STATUS_COMPLETED,
            $operation->fresh()->status
        );
        $this->assertNotNull($operation->fresh()->completed_at);
    }

    private function operation(
        int $passengerId,
        string $email
    ): WebxpayTokenizationOperation {
        return WebxpayTokenizationOperation::create([
            'passenger_id' => $passengerId,
            'status' => WebxpayTokenizationOperation::STATUS_INITIATED,
            'customer_id' => 'picku-passenger-'.$passengerId,
            'customer_email' => $email,
            'expires_at' => now()->addMinutes(15),
        ]);
    }

    /**
     * @return array<string, string>
     */
    private function billing(): array
    {
        return [
            'address_line_one' => 'Kandy',
            'city' => 'Kandy',
            'postal_code' => '20000',
            'country' => 'Sri Lanka',
        ];
    }
}
