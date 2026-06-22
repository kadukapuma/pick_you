<?php

namespace Tests\Unit\Services\Idempotency;

use App\Services\Idempotency\RequestFingerprint;
use Illuminate\Http\Request;
use PHPUnit\Framework\TestCase;

class RequestFingerprintTest extends TestCase
{
    public function test_payload_key_order_does_not_change_fingerprint(): void
    {
        $fingerprint = new RequestFingerprint;

        $first = Request::create('/api/rides', 'POST', [
            'pickup' => ['latitude' => 6.9, 'longitude' => 79.8],
            'vehicle_type_id' => 2,
        ]);
        $second = Request::create('/api/rides', 'POST', [
            'vehicle_type_id' => 2,
            'pickup' => ['longitude' => 79.8, 'latitude' => 6.9],
        ]);

        $this->assertSame($fingerprint->make($first), $fingerprint->make($second));
    }

    public function test_different_requests_have_different_fingerprints(): void
    {
        $fingerprint = new RequestFingerprint;

        $first = Request::create('/api/rides/10/accept', 'POST');
        $second = Request::create('/api/rides/11/accept', 'POST');

        $this->assertNotSame($fingerprint->make($first), $fingerprint->make($second));
    }
}
