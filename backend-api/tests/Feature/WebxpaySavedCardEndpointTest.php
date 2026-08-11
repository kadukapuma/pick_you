<?php

namespace Tests\Feature;

use App\Models\Passenger;
use App\Models\PassengerPaymentMethod;
use App\Services\Payments\WebxpaySavedCardSynchronizer;
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
}
