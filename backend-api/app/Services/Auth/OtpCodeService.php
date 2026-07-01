<?php

namespace App\Services\Auth;

use Illuminate\Support\Facades\Hash;

class OtpCodeService
{
    public function generate(): string
    {
        return (string) random_int(1000, 9999);
    }

    public function storeValue(string $code): string
    {
        return Hash::make($code);
    }

    public function matches(string $input, ?string $stored): bool
    {
        if ($stored === null || $stored === '') {
            return false;
        }

        if (Hash::info($stored)['algo'] !== null) {
            return Hash::check($input, $stored);
        }

        return hash_equals($stored, $input);
    }

    public function debugPayload(string $code): array
    {
        if (! app()->environment('local') || ! config('app.debug')) {
            return [];
        }

        return ['otp' => $code];
    }
}
