<?php

namespace App\Services\Payments;

use App\Models\Passenger;
use App\Models\WebxpayTokenizationOperation;
use Illuminate\Support\Facades\URL;
use RuntimeException;

class WebxpayTokenizationSetup
{
    /**
     * @return array{operation: WebxpayTokenizationOperation, setup_url: string}
     */
    public function create(Passenger $passenger): array
    {
        $passenger->loadMissing('user');
        $email = $passenger->user?->email;

        if (! is_string($email) || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new RuntimeException(
                'Passenger must have a valid email address to save a WEBXPAY card.'
            );
        }

        $ttlMinutes = (int) config(
            'payments.webxpay.tokenization.operation_ttl_minutes',
            15
        );

        if ($ttlMinutes < 1 || $ttlMinutes > 60) {
            throw new RuntimeException(
                'WEBXPAY tokenization operation duration is invalid.'
            );
        }

        $expiresAt = now()->addMinutes($ttlMinutes);
        $operation = WebxpayTokenizationOperation::create([
            'passenger_id' => $passenger->id,
            'status' => WebxpayTokenizationOperation::STATUS_INITIATED,
            'customer_id' => 'picku-passenger-'.$passenger->id,
            'customer_email' => $email,
            'expires_at' => $expiresAt,
        ]);

        $signedPath = URL::temporarySignedRoute(
            'webxpay.tokenization.setup',
            $expiresAt,
            ['operation' => $operation->id],
            absolute: false
        );

        return [
            'operation' => $operation,
            'setup_url' => rtrim((string) config('app.url'), '/')
                .'/'.ltrim($signedPath, '/'),
        ];
    }
}
