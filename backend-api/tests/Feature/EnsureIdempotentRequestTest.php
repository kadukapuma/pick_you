<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureIdempotentRequest;
use App\Models\User;
use App\Services\Idempotency\RequestFingerprint;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class EnsureIdempotentRequestTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
        });
        Schema::create('idempotency_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('key', 128);
            $table->string('request_hash', 64);
            $table->string('status', 20);
            $table->unsignedSmallInteger('response_status')->nullable();
            $table->json('response_body')->nullable();
            $table->timestamp('expires_at')->index();
            $table->timestamps();
            $table->unique(['user_id', 'key']);
        });

        DB::table('users')->insert(['id' => 1, 'created_at' => now(), 'updated_at' => now()]);
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('idempotency_records');
        Schema::dropIfExists('users');

        parent::tearDown();
    }

    public function test_replays_completed_response_without_running_mutation_twice(): void
    {
        $middleware = new EnsureIdempotentRequest(new RequestFingerprint);
        $executions = 0;
        $next = function () use (&$executions) {
            $executions++;

            return response()->json(['result' => 'created'], 201);
        };

        $first = $middleware->handle($this->request(['amount' => 10]), $next);
        $second = $middleware->handle($this->request(['amount' => 10]), $next);

        $this->assertSame(1, $executions);
        $this->assertSame(201, $first->getStatusCode());
        $this->assertSame(201, $second->getStatusCode());
        $this->assertSame($first->getData(true), $second->getData(true));
    }

    public function test_rejects_reusing_key_for_a_different_request(): void
    {
        $middleware = new EnsureIdempotentRequest(new RequestFingerprint);
        $next = fn () => response()->json(['result' => 'created'], 201);

        $middleware->handle($this->request(['amount' => 10]), $next);
        $response = $middleware->handle($this->request(['amount' => 20]), $next);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function test_does_not_cache_a_transient_rate_limit_response(): void
    {
        $middleware = new EnsureIdempotentRequest(new RequestFingerprint);
        $executions = 0;
        $next = function () use (&$executions) {
            $executions++;

            return response()->json(['message' => 'Too Many Attempts.'], 429);
        };

        $first = $middleware->handle($this->request(['amount' => 10]), $next);
        $second = $middleware->handle($this->request(['amount' => 10]), $next);

        $this->assertSame(2, $executions);
        $this->assertSame(429, $first->getStatusCode());
        $this->assertSame(429, $second->getStatusCode());
        $this->assertDatabaseCount('idempotency_records', 0);
    }

    private function request(array $payload): Request
    {
        $request = Request::create('/api/test-mutation', 'POST', $payload, server: [
            'HTTP_IDEMPOTENCY_KEY' => 'test-key-123456',
        ]);
        $request->setUserResolver(fn () => User::findOrFail(1));

        return $request;
    }
}
