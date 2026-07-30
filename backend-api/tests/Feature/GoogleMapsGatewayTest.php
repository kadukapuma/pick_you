<?php

namespace Tests\Feature;

use App\Models\FareConfig;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GoogleMapsGatewayTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['google_maps.api_key' => 'server-test-key']);

        $user = User::create([
            'first_name' => 'Passenger',
            'last_name' => 'Person',
            'email' => 'passenger@example.com',
            'phone' => '94770000000',
            'phone_normalized' => '94770000000',
            'password' => 'password',
            'role' => User::ROLE_PASSENGER,
            'is_active' => true,
            'is_verified' => true,
        ]);
        $user->passenger()->create(['wallet_balance' => 0]);
        $user->ensureRole(User::ROLE_PASSENGER);

        Sanctum::actingAs($user, ['role:passenger']);
    }

    public function test_places_autocomplete_is_proxied_with_session_token(): void
    {
        Http::fake([
            'https://places.googleapis.com/v1/places:autocomplete' => Http::response([
                'suggestions' => [[
                    'placePrediction' => [
                        'placeId' => 'place-123',
                        'text' => ['text' => 'Kandy City Centre, Kandy'],
                        'structuredFormat' => [
                            'mainText' => ['text' => 'Kandy City Centre'],
                            'secondaryText' => ['text' => 'Kandy'],
                        ],
                        'types' => ['point_of_interest'],
                    ],
                ]],
            ]),
        ]);

        $this->getJson('/api/maps/places/autocomplete?input=kan&session_token=session-123')
            ->assertOk()
            ->assertJsonPath('data.0.placeId', 'place-123')
            ->assertJsonPath('data.0.provider', 'google')
            ->assertJsonMissingPath('data.0.latitude');

        Http::assertSent(fn ($request) => $request->url() === 'https://places.googleapis.com/v1/places:autocomplete'
            && $request->header('X-Goog-Api-Key')[0] === 'server-test-key'
            && $request['sessionToken'] === 'session-123'
            && $request['includedRegionCodes'] === ['lk']);
    }

    public function test_places_autocomplete_returns_google_error_message(): void
    {
        Http::fake([
            'https://places.googleapis.com/v1/places:autocomplete' => Http::response([
                'error' => [
                    'code' => 403,
                    'message' => 'Places API has not been used in project 123 before or it is disabled.',
                    'status' => 'PERMISSION_DENIED',
                ],
            ], 403),
        ]);

        $this->getJson('/api/maps/places/autocomplete?input=kan&session_token=session-123')
            ->assertStatus(502)
            ->assertJsonPath(
                'message',
                'Google Maps request failed: Places API has not been used in project 123 before or it is disabled.',
            );
    }

    public function test_place_details_resolves_coordinates(): void
    {
        Http::fake([
            'https://places.googleapis.com/v1/places/place-123*' => Http::response([
                'id' => 'place-123',
                'formattedAddress' => 'Kandy City Centre, Kandy, Sri Lanka',
                'displayName' => ['text' => 'Kandy City Centre'],
                'location' => ['latitude' => 7.293, 'longitude' => 80.635],
                'types' => ['point_of_interest'],
            ]),
        ]);

        $this->getJson('/api/maps/places/details?place_id=place-123&session_token=session-123')
            ->assertOk()
            ->assertJsonPath('data.latitude', 7.293)
            ->assertJsonPath('data.longitude', 80.635)
            ->assertJsonPath('data.provider', 'google');

        Http::assertSent(fn ($request) => str_contains($request->url(), 'sessionToken=session-123')
            && $request->header('X-Goog-FieldMask')[0] === 'id,formattedAddress,location,displayName,types');
    }

    public function test_reverse_geocode_returns_normalized_location(): void
    {
        Http::fake([
            'https://maps.googleapis.com/maps/api/geocode/json*' => Http::response([
                'status' => 'OK',
                'results' => [[
                    'place_id' => 'reverse-123',
                    'formatted_address' => 'Colombo, Sri Lanka',
                ]],
            ]),
        ]);

        $this->postJson('/api/maps/geocode/reverse', [
            'latitude' => 6.927,
            'longitude' => 79.861,
        ])
            ->assertOk()
            ->assertJsonPath('data.address', 'Colombo')
            ->assertJsonPath('data.provider', 'google');
    }

    public function test_routes_and_estimates_use_google_route_values(): void
    {
        FareConfig::create([
            'vehicle_type' => 'car',
            'base_fare' => 100,
            'per_km_rate' => 50,
            'per_minute_rate' => 10,
            'is_active' => true,
        ]);

        Http::fake([
            'https://routes.googleapis.com/directions/v2:computeRoutes' => Http::response([
                'routes' => [[
                    'distanceMeters' => 2500,
                    'duration' => '600s',
                    'polyline' => ['encodedPolyline' => '_p~iF~ps|U_ulLnnqC_mqNvxq`@'],
                    'legs' => [[
                        'steps' => [[
                            'distanceMeters' => 450,
                            'staticDuration' => '90s',
                            'navigationInstruction' => [
                                'maneuver' => 'TURN_LEFT',
                                'instructions' => 'Turn left onto Kandy Road',
                            ],
                        ]],
                    ]],
                ]],
            ]),
        ]);

        $this->postJson('/api/maps/routes', [
            'origin' => ['latitude' => 7.29, 'longitude' => 80.63],
            'destination' => ['latitude' => 7.3, 'longitude' => 80.64],
        ])
            ->assertOk()
            ->assertJsonPath('data.distance', 2500)
            ->assertJsonPath('data.duration', 600)
            ->assertJsonPath('data.distanceText', '2.5 km')
            ->assertJsonPath('data.currentStep.distance', 450)
            ->assertJsonPath('data.currentStep.distanceText', '450 m')
            ->assertJsonPath('data.currentStep.durationText', '2 mins')
            ->assertJsonPath('data.currentStep.instruction', 'Turn left onto Kandy Road')
            ->assertJsonPath('data.currentStep.maneuver', 'TURN_LEFT');

        $this->postJson('/api/rides/estimate', [
            'vehicle_type' => 'car',
            'pickup_lat' => 7.29,
            'pickup_lng' => 80.63,
            'drop_lat' => 7.3,
            'drop_lng' => 80.64,
        ])
            ->assertOk()
            ->assertJsonPath('data.distance_km', 2.5)
            ->assertJsonPath('data.estimated_duration_minutes', 10)
            ->assertJsonPath('data.estimated_fare', 325);

        Http::assertSent(fn ($request) => $request->url() === 'https://routes.googleapis.com/directions/v2:computeRoutes'
            && str_contains($request->header('X-Goog-FieldMask')[0] ?? '', 'routes.legs.steps.distanceMeters')
            && str_contains($request->header('X-Goog-FieldMask')[0] ?? '', 'routes.legs.steps.navigationInstruction')
            && ! str_contains($request->header('X-Goog-FieldMask')[0] ?? '', 'routes.legs.steps.duration')
            && $request['polylineQuality'] === 'HIGH_QUALITY'
            && $request['polylineEncoding'] === 'ENCODED_POLYLINE');
    }

    public function test_routes_fall_back_without_fake_turn_instruction_when_google_fails(): void
    {
        Http::fake([
            'https://routes.googleapis.com/directions/v2:computeRoutes' => Http::response([
                'error' => [
                    'code' => 503,
                    'message' => 'Routes unavailable',
                    'status' => 'UNAVAILABLE',
                ],
            ], 503),
        ]);

        $this->postJson('/api/maps/routes', [
            'origin' => ['latitude' => 6.92, 'longitude' => 79.86],
            'destination' => ['latitude' => 6.94, 'longitude' => 79.88],
        ])
            ->assertOk()
            ->assertJsonPath('data.steps', [])
            ->assertJsonPath('data.currentStep', null)
            ->assertJsonMissingPath('data.currentStep.instruction');
    }
}
