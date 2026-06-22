<?php

namespace App\Services\Idempotency;

use Illuminate\Http\Request;

class RequestFingerprint
{
    public function make(Request $request): string
    {
        $payload = $request->all();
        $this->sortRecursively($payload);

        return hash('sha256', json_encode([
            'method' => $request->getMethod(),
            'path' => $request->path(),
            'payload' => $payload,
        ], JSON_THROW_ON_ERROR));
    }

    private function sortRecursively(array &$value): void
    {
        ksort($value);
        foreach ($value as &$item) {
            if (is_array($item)) {
                $this->sortRecursively($item);
            }
        }
    }
}
