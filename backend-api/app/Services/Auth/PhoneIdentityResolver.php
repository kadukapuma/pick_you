<?php

namespace App\Services\Auth;

use App\Models\User;

class PhoneIdentityResolver
{
    public function __construct(private readonly PhoneNumberNormalizer $phones) {}

    public function resolve(string $phone, bool $lockForUpdate = false): ?User
    {
        $normalized = $this->phones->normalize($phone);
        $query = User::query()->where(function ($query) use ($normalized, $phone) {
            $query->where('phone_normalized', $normalized)
                ->orWhereIn('phone', $this->phones->candidates($phone));
        });
        if ($lockForUpdate) {
            $query->lockForUpdate();
        }
        $matches = $query->limit(2)->get();
        if ($matches->count() > 1) {
            throw new PhoneIdentityConflict('Multiple accounts use this phone number. Please contact support.');
        }

        return $matches->first();
    }
}
