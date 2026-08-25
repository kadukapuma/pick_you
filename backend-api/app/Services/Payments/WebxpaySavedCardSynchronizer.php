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
            /**
             * Deliberately no "delete anything WEBXPAY didn't just list"
             * step here. WEBXPAY's card list can be transiently incomplete
             * (seen in practice: the same customer/email query returning a
             * card, then returning none, seconds apart) - treating one read
             * as authoritative for deletion was silently wiping valid saved
             * cards. A card is only ever removed by the passenger explicitly
             * deleting it (see WebxpaySavedCardRemover), which already
             * deletes the local row itself and doesn't depend on this sync.
             */
            if ($cards !== []) {
                $now = now();

                /**
                 * Atomic upsert (INSERT ... ON CONFLICT (gateway, token) DO
                 * UPDATE) instead of firstOrNew+save. The card-add callback
                 * and the "list saved cards" endpoint can both reconcile the
                 * same new card at nearly the same instant; a check-then-
                 * insert has a race window that trips the unique constraint
                 * under contention, and simply retrying the transaction
                 * still has to win a timing race. An upsert has no such
                 * window - concurrent callers just converge on one row.
                 */
                PassengerPaymentMethod::query()->upsert(
                    array_map(fn (WebxpayTokenizedCard $card) => [
                        'passenger_id' => $passenger->id,
                        'gateway' => 'webxpay',
                        'token' => $card->providerId(),
                        'brand' => strtolower($card->brand),
                        'last4' => $card->last4,
                        'exp_month' => $card->expMonth,
                        'exp_year' => $card->expYear,
                        'is_default' => false,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ], $cards),
                    ['gateway', 'token'],
                    ['brand', 'last4', 'exp_month', 'exp_year', 'updated_at']
                );

                $hasDefault = PassengerPaymentMethod::query()
                    ->where('passenger_id', $passenger->id)
                    ->where('is_default', true)
                    ->exists();

                if (! $hasDefault) {
                    PassengerPaymentMethod::query()
                        ->where('passenger_id', $passenger->id)
                        ->where('gateway', 'webxpay')
                        ->orderBy('id')
                        ->limit(1)
                        ->update(['is_default' => true]);
                }
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
