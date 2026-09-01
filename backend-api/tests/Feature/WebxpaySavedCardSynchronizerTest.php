<?php

namespace Tests\Feature;

use App\Models\PassengerPaymentMethod;
use App\Services\Payments\WebxpaySavedCardSynchronizer;
use App\Services\Payments\WebxpayTokenizationClient;
use App\Services\Payments\WebxpayTokenizedCard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class WebxpaySavedCardSynchronizerTest extends TestCase
{
    use BuildsLedgerScenarios, RefreshDatabase;

    public function test_it_syncs_webxpay_cards_without_touching_other_gateways(): void
    {
        [$user, $passenger] = $this->makePassenger();

        $mockCard = $this->makeCard($passenger);
        $existingCard = PassengerPaymentMethod::create([
            'passenger_id' => $passenger->id,
            'gateway' => 'webxpay',
            'token' => 'existing-provider-card',
            'brand' => 'visa',
            'last4' => '9999',
            'exp_month' => 1,
            'exp_year' => 2030,
            'is_default' => false,
        ]);

        $this->mock(
            WebxpayTokenizationClient::class,
            function (MockInterface $mock) use ($user, $passenger) {
                $mock->shouldReceive('cards')
                    ->once()
                    ->with(
                        'picku-passenger-'.$passenger->id,
                        $user->email
                    )
                    ->andReturn([
                        new WebxpayTokenizedCard(
                            providerId: 'provider-card-id',
                            brand: 'VISA',
                            last4: '1111',
                            expMonth: 12,
                            expYear: 2030
                        ),
                    ]);
            }
        );

        $methods = app(WebxpaySavedCardSynchronizer::class)
            ->sync($passenger);

        // WEBXPAY's list not mentioning a previously-synced card doesn't
        // mean it's gone - its own list endpoint can be transiently
        // incomplete, so a card is only ever removed by explicit deletion.
        $this->assertCount(2, $methods);
        $this->assertDatabaseHas('passenger_payment_methods', [
            'id' => $mockCard->id,
            'gateway' => 'mock',
            'is_default' => true,
        ]);
        $this->assertDatabaseHas('passenger_payment_methods', [
            'id' => $existingCard->id,
            'gateway' => 'webxpay',
        ]);
        $this->assertDatabaseHas('passenger_payment_methods', [
            'passenger_id' => $passenger->id,
            'gateway' => 'webxpay',
            'token' => 'provider-card-id',
            'brand' => 'visa',
            'last4' => '1111',
            'exp_month' => 12,
            'exp_year' => 2030,
            'is_default' => false,
        ]);
    }

    public function test_first_synced_card_becomes_the_default(): void
    {
        [$user, $passenger] = $this->makePassenger();

        $this->mock(
            WebxpayTokenizationClient::class,
            function (MockInterface $mock) use ($user, $passenger) {
                $mock->shouldReceive('cards')
                    ->once()
                    ->with(
                        'picku-passenger-'.$passenger->id,
                        $user->email
                    )
                    ->andReturn([
                        new WebxpayTokenizedCard(
                            providerId: 'provider-card-id',
                            brand: 'VISA',
                            last4: '1111',
                            expMonth: 12,
                            expYear: 2030
                        ),
                    ]);
            }
        );

        $method = app(WebxpaySavedCardSynchronizer::class)
            ->sync($passenger)
            ->sole();

        $this->assertTrue($method->is_default);
        $this->assertArrayNotHasKey('token', $method->toArray());
    }

    public function test_empty_provider_list_does_not_delete_existing_local_cards(): void
    {
        [$user, $passenger] = $this->makePassenger();

        $mockCard = $this->makeCard($passenger);
        $webxpayCard = PassengerPaymentMethod::create([
            'passenger_id' => $passenger->id,
            'gateway' => 'webxpay',
            'token' => 'provider-card-id',
            'brand' => 'visa',
            'last4' => '1111',
            'exp_month' => 12,
            'exp_year' => 2030,
            'is_default' => false,
        ]);

        // A WEBXPAY list response can be transiently empty even though the
        // card is still valid on their side - sync must not treat that as
        // "delete everything."
        $this->mock(
            WebxpayTokenizationClient::class,
            function (MockInterface $mock) use ($user, $passenger) {
                $mock->shouldReceive('cards')
                    ->once()
                    ->with(
                        'picku-passenger-'.$passenger->id,
                        $user->email
                    )
                    ->andReturn([]);
            }
        );

        $methods = app(WebxpaySavedCardSynchronizer::class)
            ->sync($passenger);

        $this->assertCount(1, $methods);
        $this->assertDatabaseHas('passenger_payment_methods', [
            'id' => $mockCard->id,
            'gateway' => 'mock',
        ]);
        $this->assertDatabaseHas('passenger_payment_methods', [
            'id' => $webxpayCard->id,
            'gateway' => 'webxpay',
        ]);
    }
}
