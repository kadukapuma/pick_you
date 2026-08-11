<?php

namespace App\Services\Payments;

use App\Models\Passenger;
use App\Models\PassengerPaymentMethod;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class WebxpaySavedCardRemover
{
    public function __construct(
        private readonly WebxpayTokenizationClient $client
    ) {}

    public function remove(
        Passenger $passenger,
        PassengerPaymentMethod $method
    ): void {
        if ($method->passenger_id !== $passenger->id) {
            throw new RuntimeException(
                'WEBXPAY payment method does not belong to this passenger.'
            );
        }

        if ($method->gateway !== 'webxpay') {
            throw new RuntimeException(
                'Payment method is not a WEBXPAY card.'
            );
        }

        $passenger->loadMissing('user');
        $email = $passenger->user?->email;

        if (! is_string($email) || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new RuntimeException(
                'Passenger must have a valid email address to remove a WEBXPAY card.'
            );
        }

        $this->client->deleteCard(
            cardId: (string) $method->getRawOriginal('token'),
            customerId: 'picku-passenger-'.$passenger->id,
            customerEmail: $email
        );

        DB::transaction(function () use ($passenger, $method) {
            $wasDefault = $method->is_default;
            $method->delete();

            if ($wasDefault) {
                PassengerPaymentMethod::query()
                    ->where('passenger_id', $passenger->id)
                    ->orderByDesc('id')
                    ->first()
                    ?->update(['is_default' => true]);
            }
        }, 3);
    }
}
