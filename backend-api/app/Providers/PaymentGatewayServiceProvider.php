<?php

namespace App\Providers;

use App\Services\Payments\MockPaymentGateway;
use App\Services\Payments\PaymentGateway;
use Illuminate\Support\ServiceProvider;
use RuntimeException;

class PaymentGatewayServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(PaymentGateway::class, function ($app) {
            $driver = (string) config('payments.driver', 'mock');

            // Second guard, in front of the one inside MockPaymentGateway: a stray
            // PAYMENTS_DRIVER=mock in a production .env fails rather than quietly
            // minting driver balances for uncollected money. Overridable only by
            // an explicit, separate opt-in - never by PAYMENTS_DRIVER alone.
            if ($driver === 'mock'
                && $app->environment('production')
                && ! config('payments.allow_mock_in_production')
            ) {
                throw new RuntimeException(
                    'payments.driver is "mock" in production. Refusing to run - the mock '
                    .'gateway credits drivers for money that was never collected. Set '
                    .'PAYMENTS_ALLOW_MOCK_IN_PRODUCTION=true only if you understand that, '
                    .'and do not pay drivers out while it is enabled.'
                );
            }

            return match ($driver) {
                'mock' => new MockPaymentGateway(),
                'payhere' => throw new RuntimeException('PayHere gateway is not implemented yet.'),
                default => throw new RuntimeException("Unknown payment gateway driver: {$driver}."),
            };
        });
    }
}
