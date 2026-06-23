<?php

namespace App\Services\Auth;

use InvalidArgumentException;

class PhoneNumberNormalizer
{
    public function normalize(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone);
        if (strlen($digits) === 10 && str_starts_with($digits, '0')) {
            $digits = '94'.substr($digits, 1);
        }

        if (strlen($digits) !== 11 || ! str_starts_with($digits, '94')) {
            throw new InvalidArgumentException('Invalid Sri Lankan mobile number.');
        }

        return $digits;
    }

    /** @return array<int, string> */
    public function candidates(string $phone): array
    {
        try {
            $normalized = $this->normalize($phone);
        } catch (InvalidArgumentException) {
            return array_values(array_unique([$phone, preg_replace('/\D+/', '', $phone)]));
        }

        return array_values(array_unique([$phone, $normalized, '0'.substr($normalized, 2)]));
    }
}
