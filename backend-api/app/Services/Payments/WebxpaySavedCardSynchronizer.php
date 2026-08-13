<?php

namespace App\Services\Payments;

use App\Models\Passenger;
use App\Models\PassengerPaymentMethod;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class WebxpaySavedCardSynchronizer
{
    public function __construct(
        private readonly WebxpayTokenizationClient $client
    ) {}

    /**
     * @return Collection<int, PassengerPaymentMethod>
     */
    public function sync(Passenger $passenger): Collection
    {
        $passenger->loadMissing('user');
        $email = $passenger->user?->email;

        if (! is_string($email) || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new RuntimeException(
                'Passenger must have a valid email address to retrieve WEBXPAY cards.'
            );
        }

        $cards = $this->client->cards(
            $this->customerId($passenger),
            $email
        );

        return DB::transaction(function () use ($passenger, $cards) {
            $providerIds = array_map(
                fn (WebxpayTokenizedCard $card) => $card->providerId(),
                $cards
            );

            $query = PassengerPaymentMethod::query()
                ->where('passenger_id', $passenger->id)
                ->where('gateway', 'webxpay');

            if ($providerIds === []) {
                $query->delete();
            } else {
                $query->whereNotIn('token', $providerIds)->delete();
            }

            $hasDefault = PassengerPaymentMethod::query()
                ->where('passenger_id', $passenger->id)
                ->where('is_default', true)
                ->exists();

            foreach ($cards as $card) {
                $method = PassengerPaymentMethod::query()->firstOrNew([
                    'passenger_id' => $passenger->id,
                    'gateway' => 'webxpay',
                    'token' => $card->providerId(),
                ]);

                $method->fill([
                    'brand' => strtolower($card->brand),
                    'last4' => $card->last4,
                    'exp_month' => $card->expMonth,
                    'exp_year' => $card->expYear,
                ]);

                if (! $method->exists && ! $hasDefault) {
                    $method->is_default = true;
                    $hasDefault = true;
                }

                $method->save();
            }

            return PassengerPaymentMethod::query()
                ->where('passenger_id', $passenger->id)
                ->where('gateway', 'webxpay')
                ->orderByDesc('is_default')
                ->orderByDesc('id')
                ->get();
        });
    }

    public function customerId(Passenger $passenger): string
    {
        if (! $passenger->exists) {
            throw new RuntimeException(
                'Passenger must exist before creating a WEBXPAY customer ID.'
            );
        }

        return 'picku-passenger-'.$passenger->getKey();
    }
}
