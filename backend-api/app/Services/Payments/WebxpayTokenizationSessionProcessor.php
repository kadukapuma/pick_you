<?php

namespace App\Services\Payments;

use App\Models\WebxpayTokenizationOperation;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use RuntimeException;

class WebxpayTokenizationSessionProcessor
{
    public function __construct(
        private readonly WebxpayTokenizationClient $client,
        private readonly WebxpaySavedCardSynchronizer $synchronizer
    ) {}

    /**
     * @param  array{address_line_one: string, city: string, postal_code: string, country: string}  $billing
     */
    public function process(
        WebxpayTokenizationOperation $operation,
        string $sessionId,
        array $billing
    ): WebxpaySaveCardResult {
        $callbackToken = Str::random(64);

        $operation = DB::transaction(function () use (
            $operation,
            $callbackToken
        ) {
            $locked = WebxpayTokenizationOperation::query()
                ->lockForUpdate()
                ->findOrFail($operation->id);

            if (! $locked->canAcceptSession()) {
                throw new DomainException(
                    'WEBXPAY card setup is no longer available.'
                );
            }

            $locked->markProcessing(
                hash('sha256', $callbackToken)
            );

            return $locked;
        }, 3);

        $operation->loadMissing('passenger.user');
        $user = $operation->passenger?->user;

        if (! $user) {
            throw new RuntimeException(
                'WEBXPAY card setup passenger is unavailable.'
            );
        }

        $result = $this->client->saveCard(
            sessionId: $sessionId,
            bankMid: (string) config(
                'payments.webxpay.tokenization.bank_mid'
            ),
            threeDsResponseUrl: $this->callbackUrl(
                $operation,
                $callbackToken
            ),
            customer: [
                'id' => $operation->customer_id,
                'email' => $operation->customer_email,
                'firstName' => $this->requiredText(
                    $user->first_name,
                    'first name'
                ),
                'lastName' => $this->requiredText(
                    $user->last_name,
                    'last name'
                ),
                'contactNumber' => $this->contactNumber(
                    $user->phone_normalized ?: $user->phone
                ),
                'addressLineOne' => $billing['address_line_one'],
                'city' => $billing['city'],
                'postalCode' => $billing['postal_code'],
                'country' => $billing['country'],
            ]
        );

        if ($result->requiresThreeDs()) {
            $operation->markThreeDsRequired();

            return $result;
        }

        $this->synchronizer->sync($operation->passenger);
        $operation->markCompleted();

        return $result;
    }

    private function callbackUrl(
        WebxpayTokenizationOperation $operation,
        string $callbackToken
    ): string {
        $path = URL::route(
            'webxpay.tokenization.return',
            [
                'operation' => $operation->id,
                'token' => $callbackToken,
            ],
            absolute: false
        );

        return rtrim((string) config('app.url'), '/')
            .'/'.ltrim($path, '/');
    }

    private function requiredText(mixed $value, string $field): string
    {
        $value = trim((string) $value);

        if ($value === '') {
            throw new RuntimeException(
                "Passenger {$field} is required for WEBXPAY card setup."
            );
        }

        return $value;
    }

    private function contactNumber(mixed $value): string
    {
        $value = trim((string) $value);

        if (preg_match('/^[0-9+]{9,20}$/', $value) !== 1) {
            throw new RuntimeException(
                'Passenger contact number is invalid for WEBXPAY card setup.'
            );
        }

        return $value;
    }
}
