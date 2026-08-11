<?php

namespace Tests\Feature;

use App\Models\Passenger;
use App\Models\PassengerPaymentMethod;
use App\Services\Payments\WebxpaySavedCardSynchronizer;
use App\Services\Payments\WebxpayTokenizationClient;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Mockery\MockInterface;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class WebxpaySavedCardEndpointTest extends TestCase
{
    use BuildsLedgerScenarios, RefreshDatabase;

    public function test_unauthenticated_passenger_cannot_list_webxpay_cards(): void
    {
        config()->set(
            'payments.webxpay.tokenization.enabled',
            true
        );

        $this->getJson('/api/payment-methods/webxpay')
            ->assertUnauthorized();
    }

    public function test_disabled_tokenization_does_not_contact_webxpay(): void
    {
        [$user] = $this->makePassenger();
        Sanctum::actingAs($user, ['role:passenger']);

        config()->set(
            'payments.webxpay.tokenization.enabled',
            false
        );

        $this->mock(
            WebxpaySavedCardSynchronizer::class,
            fn (MockInterface $mock) => $mock
                ->shouldNotReceive('sync')
        );

        $this->getJson('/api/payment-methods/webxpay')
            ->assertStatus(503)
            ->assertJsonPath(
                'message',
                'WEBXPAY saved cards are unavailable.'
            );
    }

    public function test_passenger_receives_only_safe_saved_card_metadata(): void
    {
        [$user, $passenger] = $this->makePassenger();
        Sanctum::actingAs($user, ['role:passenger']);

        config()->set(
            'payments.webxpay.tokenization.enabled',
            true
        );

        $method = PassengerPaymentMethod::create([
            'passenger_id' => $passenger->id,
            'gateway' => 'webxpay',
            'token' => 'provider-card-secret',
            'brand' => 'visa',
            'last4' => '1111',
            'exp_month' => 12,
            'exp_year' => 2030,
            'is_default' => true,
        ]);

        $this->mock(
            WebxpaySavedCardSynchronizer::class,
            function (MockInterface $mock) use ($passenger, $method) {
                $mock->shouldReceive('sync')
                    ->once()
                    ->with(Mockery::on(
                        fn (Passenger $value) => $value->is($passenger)
                    ))
                    ->andReturn(new Collection([$method]));
            }
        );

        $response = $this->getJson(
            '/api/payment-methods/webxpay'
        )->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.gateway', 'webxpay')
            ->assertJsonPath('data.0.brand', 'visa')
            ->assertJsonPath('data.0.last4', '1111')
            ->assertJsonMissingPath('data.0.token');

        $this->assertStringNotContainsString(
            'provider-card-secret',
            $response->getContent()
        );
    }

    public function test_passenger_can_remove_own_webxpay_card_at_provider(): void
    {
        [$user, $passenger] = $this->makePassenger();
        Sanctum::actingAs($user, ['role:passenger']);
        config()->set('payments.webxpay.tokenization.enabled', true);

        $method = PassengerPaymentMethod::create([
            'passenger_id' => $passenger->id,
            'gateway' => 'webxpay',
            'token' => 'provider-card-secret',
            'brand' => 'visa',
            'last4' => '1111',
            'exp_month' => 12,
            'exp_year' => 2030,
            'is_default' => true,
        ]);

        $this->mock(
            WebxpayTokenizationClient::class,
            fn (MockInterface $mock) => $mock->shouldReceive('deleteCard')
                ->once()
                ->with(
                    'provider-card-secret',
                    'picku-passenger-'.$passenger->id,
                    $user->email
                )
        );

        $this->deleteJson(
            '/api/payment-methods/webxpay/'.$method->id
        )->assertOk()
            ->assertJsonPath(
                'message',
                'WEBXPAY payment method removed successfully.'
            );

        $this->assertDatabaseMissing('passenger_payment_methods', [
            'id' => $method->id,
        ]);
    }

    public function test_passenger_cannot_remove_another_passengers_card(): void
    {
        [$user] = $this->makePassenger();
        [, $otherPassenger] = $this->makePassenger('0771234568');
        Sanctum::actingAs($user, ['role:passenger']);
        config()->set('payments.webxpay.tokenization.enabled', true);

        $method = PassengerPaymentMethod::create([
            'passenger_id' => $otherPassenger->id,
            'gateway' => 'webxpay',
            'token' => 'other-provider-card',
            'brand' => 'visa',
            'last4' => '9999',
            'exp_month' => 12,
            'exp_year' => 2030,
            'is_default' => true,
        ]);

        $this->mock(
            WebxpayTokenizationClient::class,
            fn (MockInterface $mock) => $mock
                ->shouldNotReceive('deleteCard')
        );

        $this->deleteJson(
            '/api/payment-methods/webxpay/'.$method->id
        )->assertNotFound();

        $this->assertDatabaseHas('passenger_payment_methods', [
            'id' => $method->id,
        ]);
    }

    public function test_provider_failure_keeps_local_card(): void
    {
        [$user, $passenger] = $this->makePassenger();
        Sanctum::actingAs($user, ['role:passenger']);
        config()->set('payments.webxpay.tokenization.enabled', true);

        $method = PassengerPaymentMethod::create([
            'passenger_id' => $passenger->id,
            'gateway' => 'webxpay',
            'token' => 'provider-card-secret',
            'brand' => 'visa',
            'last4' => '1111',
            'exp_month' => 12,
            'exp_year' => 2030,
            'is_default' => true,
        ]);

        $this->mock(
            WebxpayTokenizationClient::class,
            fn (MockInterface $mock) => $mock->shouldReceive('deleteCard')
                ->once()
                ->andThrow(new \RuntimeException('Provider unavailable.'))
        );

        $this->deleteJson(
            '/api/payment-methods/webxpay/'.$method->id
        )->assertStatus(503);

        $this->assertDatabaseHas('passenger_payment_methods', [
            'id' => $method->id,
        ]);
    }
}
