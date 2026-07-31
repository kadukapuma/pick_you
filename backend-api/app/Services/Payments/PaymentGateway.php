<?php

namespace App\Services\Payments;

use App\Models\Payment;
use App\Models\PassengerPaymentMethod;

interface PaymentGateway
{
    public function name(): string;

    /**
     * Register a card and return a reusable token. Implementations never persist
     * the PAN - only the token and display metadata reach our database.
     *
     * @param  array{number: string, exp_month: int, exp_year: int, cvv?: string}  $card
     */
    public function tokenizeCard(array $card): GatewayResult;

    /**
     * Capture the final fare. Deliberately capture-at-completion rather than
     * capture-at-booking: final_fare can exceed the estimate via waiting time
     * and extra distance.
     */
    public function capture(Payment $payment, PassengerPaymentMethod $method): GatewayResult;

    public function refund(Payment $payment, string $amount): GatewayResult;
}
