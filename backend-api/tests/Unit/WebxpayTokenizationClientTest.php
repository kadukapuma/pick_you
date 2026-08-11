<?php

namespace Tests\Unit;

use App\Services\Payments\WebxpayTokenizationClient;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class WebxpayTokenizationClientTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
    }

    public function test_it_authenticates_and_caches_the_access_token(): void
    {
        Http::fake([
            'https://tokenize.test/api/auth' => Http::response([
                'token' => 'header.payload.signature',
            ]),
        ]);

        $client = $this->client();

        $this->assertSame(
            'header.payload.signature',
            $client->accessToken()
        );
        $this->assertSame(
            'header.payload.signature',
            $client->accessToken()
        );

        Http::assertSentCount(1);
        Http::assertSent(fn ($request) => $request->url() === 'https://tokenize.test/api/auth'
            && $request['username'] === 'merchant-user'
            && $request['password'] === 'merchant-password'
        );
    }

    public function test_it_rejects_failed_authentication_without_exposing_credentials(): void
    {
        Http::fake([
            'https://tokenize.test/api/auth' => Http::response([
                'error' => 'Unauthorized',
            ], 401),
        ]);

        try {
            $this->client()->accessToken();
            $this->fail('Expected authentication to fail.');
        } catch (RuntimeException $exception) {
            $this->assertSame(
                'WEBXPAY tokenization authentication failed.',
                $exception->getMessage()
            );
            $this->assertStringNotContainsString(
                'merchant-password',
                $exception->getMessage()
            );
        }
    }

    public function test_it_rejects_an_invalid_authentication_token(): void
    {
        Http::fake([
            'https://tokenize.test/api/auth' => Http::response([
                'token' => 'not-a-jwt',
            ]),
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY tokenization authentication returned an invalid token.'
        );

        $this->client()->accessToken();
    }

    public function test_it_rejects_an_insecure_base_url(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY tokenization URL must be a valid HTTPS URL.'
        );

        $this->client('http://tokenize.test');
    }

    public function test_it_retrieves_and_safely_maps_saved_cards(): void
    {
        Http::fake([
            'https://tokenize.test/api/auth' => Http::response([
                'token' => 'header.payload.signature',
            ]),
            'https://tokenize.test/api/cards/get' => Http::response([
                [
                    'bankMID' => 'TESTWEBXPATOKLKR',
                    'cardId' => 'provider-card-id',
                    'cardFirst' => '411111',
                    'cardLast' => '1111',
                    'cardExpiry' => '1230',
                    'cardScheme' => 'VISA',
                ],
            ]),
        ]);

        $cards = $this->client()->cards(
            'picku-passenger-9',
            'passenger@example.test'
        );

        $this->assertCount(1, $cards);
        $this->assertSame(
            'provider-card-id',
            $cards[0]->providerId()
        );
        $this->assertSame([
            'brand' => 'VISA',
            'last4' => '1111',
            'exp_month' => 12,
            'exp_year' => 2030,
        ], $cards[0]->toPublicArray());
        $this->assertArrayNotHasKey(
            'provider_id',
            $cards[0]->toPublicArray()
        );

        Http::assertSent(fn ($request) => $request->url() === 'https://tokenize.test/api/cards/get'
            && $request->hasHeader(
                'Authorization',
                'Bearer header.payload.signature'
            )
            && $request['customer']['id'] === 'picku-passenger-9'
            && $request['customer']['email'] === 'passenger@example.test'
        );
    }

    public function test_it_accepts_an_empty_saved_card_list(): void
    {
        Http::fake([
            'https://tokenize.test/api/auth' => Http::response([
                'token' => 'header.payload.signature',
            ]),
            'https://tokenize.test/api/cards/get' => Http::response([]),
        ]);

        $this->assertSame(
            [],
            $this->client()->cards(
                'picku-passenger-9',
                'passenger@example.test'
            )
        );
    }

    public function test_it_rejects_malformed_saved_card_data(): void
    {
        Http::fake([
            'https://tokenize.test/api/auth' => Http::response([
                'token' => 'header.payload.signature',
            ]),
            'https://tokenize.test/api/cards/get' => Http::response([
                [
                    'cardId' => 'provider-card-id',
                    'cardLast' => '1111',
                    'cardExpiry' => 'invalid',
                    'cardScheme' => 'VISA',
                ],
            ]),
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY returned an invalid card expiry.'
        );

        $this->client()->cards(
            'picku-passenger-9',
            'passenger@example.test'
        );
    }

    public function test_it_submits_a_hosted_session_and_maps_the_3ds_redirect(): void
    {
        Http::fake([
            'https://tokenize.test/api/auth' => Http::response([
                'token' => 'header.payload.signature',
            ]),
            'https://tokenize.test/api/cards/save3ds' => Http::response([
                'error' => true,
                'type' => '3ds',
                'html3ds_url' => 'https://tokenize.test/3ds/challenge-id',
            ]),
        ]);

        $result = $this->client()->saveCard(
            sessionId: 'SESSION0002407982678H6120461N79',
            bankMid: 'TESTWEBXPATOKLKR',
            threeDsResponseUrl: 'https://api.picku.test/cards/return',
            customer: $this->customer()
        );

        $this->assertFalse($result->completed);
        $this->assertTrue($result->requiresThreeDs());
        $this->assertSame(
            'https://tokenize.test/3ds/challenge-id',
            $result->threeDsUrl
        );

        Http::assertSent(fn ($request) => $request->url() === 'https://tokenize.test/api/cards/save3ds'
            && $request->hasHeader(
                'Authorization',
                'Bearer header.payload.signature'
            )
            && $request['session'] === 'SESSION0002407982678H6120461N79'
            && $request['currency'] === 'LKR'
            && $request['bankMID'] === 'TESTWEBXPATOKLKR'
            && $request['secure3dResponseURL'] === 'https://api.picku.test/cards/return'
            && $request['customer']['id'] === 'picku-passenger-9'
        );
    }

    public function test_it_maps_an_immediately_completed_card_save(): void
    {
        Http::fake([
            'https://tokenize.test/api/auth' => Http::response([
                'token' => 'header.payload.signature',
            ]),
            'https://tokenize.test/api/cards/save3ds' => Http::response([
                'success' => true,
            ]),
        ]);

        $result = $this->client()->saveCard(
            sessionId: 'SESSION0002407982678H6120461N79',
            bankMid: 'TESTWEBXPATOKLKR',
            threeDsResponseUrl: 'https://api.picku.test/cards/return',
            customer: $this->customer()
        );

        $this->assertTrue($result->completed);
        $this->assertFalse($result->requiresThreeDs());
        $this->assertNull($result->threeDsUrl);
    }

    public function test_it_rejects_an_untrusted_3ds_redirect_url(): void
    {
        Http::fake([
            'https://tokenize.test/api/auth' => Http::response([
                'token' => 'header.payload.signature',
            ]),
            'https://tokenize.test/api/cards/save3ds' => Http::response([
                'error' => true,
                'type' => '3ds',
                'html3ds_url' => 'https://attacker.test/fake-challenge',
            ]),
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY returned an invalid 3DS redirect URL.'
        );

        $this->client()->saveCard(
            sessionId: 'SESSION0002407982678H6120461N79',
            bankMid: 'TESTWEBXPATOKLKR',
            threeDsResponseUrl: 'https://api.picku.test/cards/return',
            customer: $this->customer()
        );
    }

    public function test_it_rejects_a_provider_card_save_error_safely(): void
    {
        Http::fake([
            'https://tokenize.test/api/auth' => Http::response([
                'token' => 'header.payload.signature',
            ]),
            'https://tokenize.test/api/cards/save3ds' => Http::response([
                'error' => true,
                'type' => 'invalid_mid',
                'explanation' => 'Sensitive provider explanation',
            ]),
        ]);

        try {
            $this->client()->saveCard(
                sessionId: 'SESSION0002407982678H6120461N79',
                bankMid: 'TESTWEBXPATOKLKR',
                threeDsResponseUrl: 'https://api.picku.test/cards/return',
                customer: $this->customer()
            );
            $this->fail('Expected the provider rejection to fail.');
        } catch (RuntimeException $exception) {
            $this->assertSame(
                'WEBXPAY card save request was rejected.',
                $exception->getMessage()
            );
            $this->assertStringNotContainsString(
                'Sensitive provider explanation',
                $exception->getMessage()
            );
        }
    }

    public function test_it_deletes_a_saved_card_using_server_side_identity(): void
    {
        Http::fake([
            'https://tokenize.test/api/auth' => Http::response([
                'token' => 'header.payload.signature',
            ]),
            'https://tokenize.test/api/cards' => Http::response([
                'success' => true,
            ]),
        ]);

        $this->client()->deleteCard(
            cardId: '4111111111',
            customerId: 'picku-passenger-9',
            customerEmail: 'passenger@example.test'
        );

        Http::assertSent(fn ($request) => $request->method() === 'DELETE'
            && $request->url() === 'https://tokenize.test/api/cards'
            && $request['cardId'] === '4111111111'
            && $request['customerId'] === 'picku-passenger-9'
            && $request['customerEmail'] === 'passenger@example.test'
            && $request->hasHeader('Authorization'));
    }

    public function test_it_rejects_a_provider_card_removal_failure(): void
    {
        Http::fake([
            'https://tokenize.test/api/auth' => Http::response([
                'token' => 'header.payload.signature',
            ]),
            'https://tokenize.test/api/cards' => Http::response([
                'error' => true,
                'explanation' => 'Sensitive provider detail',
            ]),
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY card removal request failed.'
        );

        $this->client()->deleteCard(
            cardId: '4111111111',
            customerId: 'picku-passenger-9',
            customerEmail: 'passenger@example.test'
        );
    }

    private function client(
        string $baseUrl = 'https://tokenize.test'
    ): WebxpayTokenizationClient {
        return new WebxpayTokenizationClient(
            http: $this->app->make(HttpFactory::class),
            baseUrl: $baseUrl,
            username: 'merchant-user',
            password: 'merchant-password',
            tokenCacheSeconds: 3300
        );
    }

    /**
     * @return array<string, string>
     */
    private function customer(): array
    {
        return [
            'id' => 'picku-passenger-9',
            'email' => 'passenger@example.test',
            'firstName' => 'Test',
            'lastName' => 'Passenger',
            'contactNumber' => '0771234567',
            'addressLineOne' => 'Kandy',
            'city' => 'Kandy',
            'postalCode' => '20000',
            'country' => 'Sri Lanka',
        ];
    }
}
