<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Services\Payments\WebxpayCheckoutRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class WebxpayCheckoutPageTest extends TestCase
{
    use BuildsLedgerScenarios;
    use RefreshDatabase;

    public function test_valid_signed_url_renders_the_webxpay_form(): void
    {
        config()->set([
            'payments.webxpay.enabled' => true,
            'payments.webxpay.checkout_url' => 'https://stagingxpay.info/index.php?route=checkout/billing',
        ]);

        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'card'
        );

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => '800.00',
            'transaction_id' => 'webxpay-page-payment',
            'payment_status' => 'PENDING',
            'gateway' => 'webxpay',
        ]);

        $attempt = $payment->attempts()->create([
            'attempt_number' => 1,
            'gateway' => 'webxpay',
            'merchant_order_id' => 'PKU-PAGE-A01',
            'status' => 'PROCESSING',
            'amount' => '800.00',
            'currency' => 'LKR',
            'started_at' => now(),
            'expires_at' => now()->addMinutes(15),
        ]);

        $builder = $this->createMock(
            WebxpayCheckoutRequest::class
        );

        $builder
            ->expects($this->once())
            ->method('build')
            ->with(
                $this->callback(
                    fn (array $customer): bool => $customer['first_name'] === 'Test'
                        && $customer['last_name'] === 'Person'
                        && $customer['email'] === $passengerUser->email
                        && $customer['contact_number'] === '0771234567'
                        && $customer['address_line_one'] === 'Pickup'
                ),
                'PKU-PAGE-A01',
                '800.00',
                [
                    "attempt-{$attempt->id}",
                    "ride-{$ride->id}",
                ]
            )
            ->willReturn([
                'first_name' => 'Test',
                'secret_key' => 'test-secret',
                'payment' => 'encrypted-payment',
            ]);

        $this->app->instance(
            WebxpayCheckoutRequest::class,
            $builder
        );

        $url = URL::temporarySignedRoute(
            'webxpay.checkout',
            $attempt->expires_at,
            [
                'attempt' => $attempt->id,
            ],
            absolute: false
        );

        $this->get($url)
            ->assertOk()
            ->assertSee(
                'https://stagingxpay.info/index.php?route=checkout/billing',
                false
            )
            ->assertSee('encrypted-payment', false);
    }

    public function test_expired_attempt_does_not_render_checkout_form(): void
    {
        config()->set([
            'payments.webxpay.enabled' => true,
        ]);

        [, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'card'
        );

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => '800.00',
            'transaction_id' => 'webxpay-expired-page-payment',
            'payment_status' => 'PENDING',
            'gateway' => 'webxpay',
        ]);

        $attempt = $payment->attempts()->create([
            'attempt_number' => 1,
            'gateway' => 'webxpay',
            'merchant_order_id' => 'PKU-EXPIRED-A01',
            'status' => 'PROCESSING',
            'amount' => '800.00',
            'currency' => 'LKR',
            'started_at' => now()->subMinutes(20),
            'expires_at' => now()->subMinute(),
        ]);

        $builder = $this->createMock(
            WebxpayCheckoutRequest::class
        );

        $builder
            ->expects($this->never())
            ->method('build');

        $this->app->instance(
            WebxpayCheckoutRequest::class,
            $builder
        );

        $url = URL::temporarySignedRoute(
            'webxpay.checkout',
            now()->addMinutes(5),
            [
                'attempt' => $attempt->id,
            ],
            absolute: false
        );

        $this->get($url)
            ->assertStatus(410);
    }

    public function test_completed_attempt_does_not_render_checkout_form(): void
    {
        config()->set([
            'payments.webxpay.enabled' => true,
        ]);

        [, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'card'
        );

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => '800.00',
            'transaction_id' => 'webxpay-completed-page-payment',
            'payment_status' => 'COMPLETED',
            'gateway' => 'webxpay',
            'gateway_reference' => 'WEBXPAY-COMPLETED-PAGE',
            'paid_at' => now(),
        ]);

        $attempt = $payment->attempts()->create([
            'attempt_number' => 1,
            'gateway' => 'webxpay',
            'merchant_order_id' => 'PKU-COMPLETED-A01',
            'status' => 'COMPLETED',
            'amount' => '800.00',
            'currency' => 'LKR',
            'started_at' => now()->subMinutes(2),
            'completed_at' => now(),
            'expires_at' => now()->addMinutes(10),
        ]);

        $builder = $this->createMock(
            WebxpayCheckoutRequest::class
        );

        $builder
            ->expects($this->never())
            ->method('build');

        $this->app->instance(
            WebxpayCheckoutRequest::class,
            $builder
        );

        $url = URL::temporarySignedRoute(
            'webxpay.checkout',
            now()->addMinutes(5),
            [
                'attempt' => $attempt->id,
            ],
            absolute: false
        );

        $this->get($url)
            ->assertStatus(409);
    }

    public function test_non_webxpay_attempt_does_not_render_checkout_form(): void
    {
        config()->set([
            'payments.webxpay.enabled' => true,
        ]);

        [, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'card'
        );

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => '800.00',
            'transaction_id' => 'mock-page-payment',
            'payment_status' => 'PENDING',
            'gateway' => 'mock',
        ]);

        $attempt = $payment->attempts()->create([
            'attempt_number' => 1,
            'gateway' => 'mock',
            'merchant_order_id' => 'PKU-MOCK-A01',
            'status' => 'PROCESSING',
            'amount' => '800.00',
            'currency' => 'LKR',
            'started_at' => now(),
            'expires_at' => now()->addMinutes(15),
        ]);

        $builder = $this->createMock(
            WebxpayCheckoutRequest::class
        );

        $builder
            ->expects($this->never())
            ->method('build');

        $this->app->instance(
            WebxpayCheckoutRequest::class,
            $builder
        );

        $url = URL::temporarySignedRoute(
            'webxpay.checkout',
            now()->addMinutes(5),
            [
                'attempt' => $attempt->id,
            ],
            absolute: false
        );

        $this->get($url)
            ->assertNotFound();
    }
}
