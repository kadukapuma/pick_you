<?php

namespace Tests\Unit\Http\Middleware;

use App\Http\Middleware\EnsureUserRole;
use App\Models\User;
use Illuminate\Http\Request;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserRoleTest extends TestCase
{
    public function test_allows_a_matching_role(): void
    {
        $request = $this->requestForRole(User::ROLE_DRIVER);
        $middleware = new EnsureUserRole;

        $response = $middleware->handle(
            $request,
            fn () => new Response('allowed', 200),
            User::ROLE_DRIVER,
        );

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('allowed', $response->getContent());
    }

    public function test_allows_one_of_multiple_roles(): void
    {
        $request = $this->requestForRole(User::ROLE_SUPER_ADMIN);
        $middleware = new EnsureUserRole;

        $response = $middleware->handle(
            $request,
            fn () => new Response('allowed', 200),
            User::ROLE_PASSENGER,
            User::ROLE_ADMIN,
            User::ROLE_SUPER_ADMIN,
        );

        $this->assertSame(200, $response->getStatusCode());
    }

    public function test_rejects_a_non_matching_role(): void
    {
        $request = $this->requestForRole(User::ROLE_PASSENGER);
        $middleware = new EnsureUserRole;

        $response = $middleware->handle(
            $request,
            fn () => new Response('allowed', 200),
            User::ROLE_DRIVER,
        );

        $this->assertSame(403, $response->getStatusCode());
        $this->assertStringContainsString('not authorized', (string) $response->getContent());
    }

    public function test_rejects_an_unauthenticated_request(): void
    {
        $request = Request::create('/api/rides', 'POST');
        $middleware = new EnsureUserRole;

        $response = $middleware->handle(
            $request,
            fn () => new Response('allowed', 200),
            User::ROLE_PASSENGER,
        );

        $this->assertSame(403, $response->getStatusCode());
    }

    private function requestForRole(string $role): Request
    {
        $request = Request::create('/api/test', 'GET');
        $user = new User(['role' => $role]);
        $request->setUserResolver(fn () => $user);

        return $request;
    }
}
