<?php

namespace App\Providers;

use App\Services\Payments\MockPaymentGateway;
use App\Services\Payments\PaymentGateway;
use App\Services\Payments\WebxpayAppResultUrl;
use App\Services\Payments\WebxpayCheckoutRequest;
use App\Services\Payments\WebxpayRequestPayload;
use App\Services\Payments\WebxpayResponseParser;
use App\Services\Payments\WebxpayResponseVerifier;
use App\Services\Payments\WebxpayTokenizationClient;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\ServiceProvider;
use RuntimeException;

class PaymentGatewayServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(
            WebxpayRequestPayload::class,
            function () {
                $configuredPath = (string) config(
                    'payments.webxpay.public_key_path'
                );

                return new WebxpayRequestPayload(
                    base_path($configuredPath)
                );
            }
        );
        $this->app->singleton(
            WebxpayResponseVerifier::class,
            function () {
                $configuredPath = (string) config(
                    'payments.webxpay.public_key_path'
                );

                return new WebxpayResponseVerifier(
                    base_path($configuredPath)
                );
            }
        );
        $this->app->singleton(
            WebxpayResponseParser::class,
            function () {
                return new WebxpayResponseParser(
                    expectedGatewayId: (string) config(
                        'payments.webxpay.response_gateway_id'
                    )
                );
            }
        );

        $this->app->singleton(
            WebxpayAppResultUrl::class,
            function () {
                return new WebxpayAppResultUrl(
                    (string) config(
                        'payments.webxpay.app_result_url'
                    )
                );
            }
        );

        $this->app->singleton(
            WebxpayCheckoutRequest::class,
            function ($app) {
                return new WebxpayCheckoutRequest(
                    payload: $app->make(
                        WebxpayRequestPayload::class
                    ),
                    secretKey: (string) config(
                        'payments.webxpay.secret_key'
                    ),
                    gatewayId: (string) config(
                        'payments.webxpay.payment_gateway_id'
                    ),
                    currency: (string) config(
                        'payments.webxpay.currency'
                    ),
                    encryptionMethod: (string) config(
                        'payments.webxpay.encryption_method'
                    )
                );
            }
        );

        $this->app->singleton(
            WebxpayTokenizationClient::class,
            function ($app) {
                return new WebxpayTokenizationClient(
                    http: $app->make(HttpFactory::class),
                    baseUrl: (string) config(
                        'payments.webxpay.tokenization.base_url'
                    ),
                    username: (string) config(
                        'payments.webxpay.tokenization.username'
                    ),
                    password: (string) config(
                        'payments.webxpay.tokenization.password'
                    ),
                    tokenCacheSeconds: (int) config(
                        'payments.webxpay.tokenization.token_cache_seconds',
                        3300
                    )
                );
            }
        );

        $this->app->singleton(PaymentGateway::class, function ($app) {
            $driver = (string) config('payments.driver', 'mock');

            // Second guard, in front of the one inside MockPaymentGateway: a stray
            // PAYMENTS_DRIVER=mock in a production .env fails rather than quietly
            // minting driver balances for uncollected money. Overridable only by
            // an explicit, separate opt-in - never by PAYMENTS_DRIVER alone.
            if (
                $driver === 'mock'
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
                'mock' => new MockPaymentGateway,
                'payhere' => throw new RuntimeException('PayHere gateway is not implemented yet.'),
                default => throw new RuntimeException("Unknown payment gateway driver: {$driver}."),
            };
        });
    }
}
