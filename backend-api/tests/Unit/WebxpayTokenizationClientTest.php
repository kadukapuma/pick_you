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
}
