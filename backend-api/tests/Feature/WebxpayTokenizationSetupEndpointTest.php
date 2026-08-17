<?php

namespace Tests\Feature;

use App\Models\WebxpayTokenizationOperation;
use App\Services\Payments\WebxpaySaveCardResult;
use App\Services\Payments\WebxpayTokenizationCallbackProcessor;
use App\Services\Payments\WebxpayTokenizationSessionProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class WebxpayTokenizationSetupEndpointTest extends TestCase
{
    use BuildsLedgerScenarios, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set([
            'app.url' => 'https://api.picku.test',
            'payments.webxpay.tokenization.enabled' => true,
            'payments.webxpay.tokenization.bank_mid' => 'TESTWEBXPATOKLKR',
            'payments.webxpay.tokenization.hosted_session_version' => '63',
            'payments.webxpay.tokenization.hosted_session_script_base_url' => 'https://cbcmpgs.gateway.mastercard.com/form',
            'payments.webxpay.tokenization.operation_ttl_minutes' => 15,
        ]);
    }

    public function test_passenger_can_prepare_a_signed_card_setup_page(): void
    {
        [$user, $passenger] = $this->makePassenger();
        Sanctum::actingAs($user, ['role:passenger']);

        $response = $this->postJson(
            '/api/payment-methods/webxpay/setup'
        )->assertCreated()
            ->assertJsonPath(
                'message',
                'WEBXPAY card setup prepared.'
            );

        $operation = WebxpayTokenizationOperation::sole();

        $this->assertSame($passenger->id, $operation->passenger_id);
        $this->assertSame(
            'picku-passenger-'.$passenger->id,
            $operation->customer_id
        );
        $this->assertSame($user->email, $operation->customer_email);
        $this->assertSame(
            WebxpayTokenizationOperation::STATUS_INITIATED,
            $operation->status
        );

        $setupUrl = $response->json('data.setup_url');
        $this->assertStringStartsWith(
            'https://api.picku.test/payments/webxpay/cards/',
            $setupUrl
        );

        $relativeUrl = parse_url($setupUrl, PHP_URL_PATH)
            .'?'.parse_url($setupUrl, PHP_URL_QUERY);

        $this->get($relativeUrl)
            ->assertOk()
            ->assertSee(
                'https://cbcmpgs.gateway.mastercard.com/form/version/63/merchant/TESTWEBXPATOKLKR/session.js',
                false
            )
            ->assertSee('PaymentSession.updateSessionFromForm', false)
            ->assertSee('fetch(sessionSubmitUrl', false)
            ->assertDontSee('WEBXPAY_TOKENIZATION_PASSWORD', false);
    }

    public function test_signed_page_can_submit_session_for_3ds(): void
    {
        [$user, $passenger] = $this->makePassenger();
        $operation = WebxpayTokenizationOperation::create([
            'passenger_id' => $passenger->id,
            'status' => WebxpayTokenizationOperation::STATUS_INITIATED,
            'customer_id' => 'picku-passenger-'.$passenger->id,
            'customer_email' => $user->email,
            'expires_at' => now()->addMinutes(15),
        ]);

        $this->mock(
            WebxpayTokenizationSessionProcessor::class,
            fn (MockInterface $mock) => $mock
                ->shouldReceive('process')
                ->once()
                ->andReturn(WebxpaySaveCardResult::threeDsRequired(
                    'https://tokenize.stagingxpay.info/3ds/challenge-id'
                ))
        );

        $url = URL::temporarySignedRoute(
            'webxpay.tokenization.session',
            $operation->expires_at,
            ['operation' => $operation->id],
            absolute: false
        );

        $this->postJson($url, [
            'session' => 'SESSION0002407982678H6120461N79',
            'address_line_one' => 'Kandy',
            'city' => 'Kandy',
            'postal_code' => '20000',
            'country' => 'Sri Lanka',
        ])->assertOk()
            ->assertJsonPath('data.requires_3ds', true)
            ->assertJsonPath(
                'data.three_ds_url',
                'https://tokenize.stagingxpay.info/3ds/challenge-id'
            );
    }

    public function test_unsigned_card_setup_page_is_rejected(): void
    {
        [$user, $passenger] = $this->makePassenger();

        $operation = WebxpayTokenizationOperation::create([
            'passenger_id' => $passenger->id,
            'status' => WebxpayTokenizationOperation::STATUS_INITIATED,
            'customer_id' => 'picku-passenger-'.$passenger->id,
            'customer_email' => $user->email,
            'expires_at' => now()->addMinutes(15),
        ]);

        $this->get('/payments/webxpay/cards/'.$operation->id)
            ->assertForbidden();
    }

    public function test_verified_callback_redirects_to_passenger_app(): void
    {
        [$user, $passenger] = $this->makePassenger();
        $operation = WebxpayTokenizationOperation::create([
            'passenger_id' => $passenger->id,
            'status' => WebxpayTokenizationOperation::STATUS_THREE_DS_REQUIRED,
            'customer_id' => 'picku-passenger-'.$passenger->id,
            'customer_email' => $user->email,
            'callback_token_hash' => hash('sha256', str_repeat('a', 64)),
            'expires_at' => now()->addMinutes(15),
        ]);

        $this->mock(
            WebxpayTokenizationCallbackProcessor::class,
            fn (MockInterface $mock) => $mock
                ->shouldReceive('process')
                ->once()
                ->andReturn(WebxpayTokenizationOperation::STATUS_COMPLETED)
        );

        $this->get(route('webxpay.tokenization.return', [
            'operation' => $operation->id,
            'token' => str_repeat('a', 64),
            'result3ds' => base64_encode('{}'),
        ], absolute: false))->assertRedirect(
            'picku://payments/card-result'
                .'?operation_id='.$operation->id
                .'&status=COMPLETED'
        );
    }

    public function test_expired_operation_does_not_render_hosted_fields(): void
    {
        [$user, $passenger] = $this->makePassenger();

        $operation = WebxpayTokenizationOperation::create([
            'passenger_id' => $passenger->id,
            'status' => WebxpayTokenizationOperation::STATUS_INITIATED,
            'customer_id' => 'picku-passenger-'.$passenger->id,
            'customer_email' => $user->email,
            'expires_at' => now()->subSecond(),
        ]);

        $url = URL::temporarySignedRoute(
            'webxpay.tokenization.setup',
            now()->addMinute(),
            ['operation' => $operation->id],
            absolute: false
        );

        $this->get($url)->assertStatus(410);
    }
}
