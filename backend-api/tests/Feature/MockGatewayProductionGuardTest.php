<?php

namespace Tests\Feature;

use App\Services\Payments\MockPaymentGateway;
use App\Services\Payments\PaymentGateway;
use RuntimeException;
use Tests\TestCase;

/**
 * The mock gateway credits drivers their share of money that was never
 * collected. Paying that out moves real cash for revenue never received, so
 * reaching production must take a deliberate, separate opt-in.
 */
class MockGatewayProductionGuardTest extends TestCase
{
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
}
