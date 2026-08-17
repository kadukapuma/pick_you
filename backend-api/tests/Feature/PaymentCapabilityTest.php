<?php

namespace Tests\Feature;

use Tests\TestCase;

class PaymentCapabilityTest extends TestCase
{
    public function test_mock_gateway_does_not_advertise_card_payments(): void
    {
        config([
            'payments.driver' => 'mock',
            'payments.webxpay.enabled' => false,
            'payments.picku_credit.enabled' => false,
        ]);

        $this->getJson('/api/payment-capabilities')
            ->assertOk()
            ->assertExactJson([
                'cash' => true,
                'card' => false,
                'wallet' => false,
                'gateway' => 'mock',
                'environment' => 'testing',
            ]);
    }

    public function test_disabled_webxpay_does_not_advertise_card_payments(): void
    {
        config([
            'payments.driver' => 'webxpay',
            'payments.webxpay.enabled' => false,
        ]);

        $this->getJson('/api/payment-capabilities')
            ->assertOk()
            ->assertJsonPath('card', false)
            ->assertJsonPath('gateway', 'webxpay');
    }

    public function test_enabled_webxpay_advertises_card_payments(): void
    {
        config([
            'payments.driver' => 'webxpay',
            'payments.webxpay.enabled' => true,
            'payments.picku_credit.enabled' => true,
        ]);

        $this->getJson('/api/payment-capabilities')
            ->assertOk()
            ->assertJsonPath('cash', true)
            ->assertJsonPath('card', true)
            ->assertJsonPath('wallet', true)
            ->assertJsonPath('gateway', 'webxpay');
    }

    public function test_disabled_picku_credit_does_not_advertise_wallet_payments(): void
    {
        config([
            'payments.picku_credit.enabled' => false,
        ]);

        $this->getJson('/api/payment-capabilities')
            ->assertOk()
            ->assertJsonPath('wallet', false);
    }
}
