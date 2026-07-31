<?php

namespace Tests\Feature;

use App\Services\Payments\MockPaymentGateway;
use App\Services\Payments\PaymentGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

/**
 * The mock gateway credits drivers their share of money that was never
 * collected. Paying that out moves real cash for revenue never received, so
 * reaching production must take a deliberate, separate opt-in.
 */
class MockGatewayProductionGuardTest extends TestCase
{
    use BuildsLedgerScenarios, RefreshDatabase;

    private function pretendProduction(): void
    {
        $this->app['env'] = 'production';
        config(['app.env' => 'production']);
    }

    public function test_mock_gateway_refuses_to_construct_in_production(): void
    {
        $this->pretendProduction();
        config(['payments.allow_mock_in_production' => false]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessageMatches('/never run in production/');

        new MockPaymentGateway();
    }

    public function test_provider_refuses_to_bind_mock_in_production(): void
    {
        $this->pretendProduction();
        config(['payments.driver' => 'mock', 'payments.allow_mock_in_production' => false]);

        $this->app->forgetInstance(PaymentGateway::class);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessageMatches('/Refusing to run/');

        $this->app->make(PaymentGateway::class);
    }

    /** PAYMENTS_DRIVER alone must never be enough to enable it. */
    public function test_driver_setting_alone_does_not_unlock_mock_in_production(): void
    {
        $this->pretendProduction();
        config(['payments.driver' => 'mock']);

        $this->app->forgetInstance(PaymentGateway::class);

        $this->expectException(RuntimeException::class);

        $this->app->make(PaymentGateway::class);
    }

    public function test_explicit_opt_in_allows_mock_in_production(): void
    {
        $this->pretendProduction();
        config(['payments.driver' => 'mock', 'payments.allow_mock_in_production' => true]);

        $this->app->forgetInstance(PaymentGateway::class);

        $this->assertInstanceOf(MockPaymentGateway::class, $this->app->make(PaymentGateway::class));
    }

    public function test_mock_binds_normally_outside_production(): void
    {
        config(['payments.driver' => 'mock', 'payments.allow_mock_in_production' => false]);

        $this->app->forgetInstance(PaymentGateway::class);

        $this->assertInstanceOf(MockPaymentGateway::class, $this->app->make(PaymentGateway::class));
    }

    public function test_unknown_driver_is_rejected(): void
    {
        config(['payments.driver' => 'not-a-gateway']);

        $this->app->forgetInstance(PaymentGateway::class);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessageMatches('/Unknown payment gateway driver/');

        $this->app->make(PaymentGateway::class);
    }

    /**
     * A misconfigured gateway must fail as a normal API error, not an
     * unhandled 500. The tell for "unhandled" is a body with no "status" key -
     * ApiResponse::error() always includes one.
     */
    public function test_card_save_returns_a_structured_error_when_the_gateway_is_misconfigured(): void
    {
        $this->pretendProduction();
        config(['payments.driver' => 'mock', 'payments.allow_mock_in_production' => false]);
        $this->app->forgetInstance(PaymentGateway::class);

        [$passengerUser] = $this->makePassenger();
        Sanctum::actingAs($passengerUser, ['role:passenger']);

        $response = $this->postJson('/api/payment-methods', [
            'number' => MockPaymentGateway::CARD_SUCCESS,
            'exp_month' => 12,
            'exp_year' => (int) now()->addYear()->year,
        ]);

        $response->assertStatus(500);
        $response->assertJsonPath('status', 'error');
        $this->assertDatabaseCount('passenger_payment_methods', 0);
    }
}
