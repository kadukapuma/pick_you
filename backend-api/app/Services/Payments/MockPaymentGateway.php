<?php

namespace App\Services\Payments;

use App\Models\PassengerPaymentMethod;
use App\Models\Payment;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Simulated gateway for development and staging.
 *
 * DANGER: a successful capture here posts a real journal entry crediting the
 * driver 94% of money that was never collected. If that reaches production,
 * PickU pays real money out of BANK for revenue it never received - and a
 * cleared bank transfer cannot be undone. Hence the constructor guard below;
 * it is deliberately a hard failure and not a config flag.
 */
class MockPaymentGateway implements PaymentGateway
{
    public const NAME = 'mock';

    /** Sample cards, so the decline and error paths are testable, not theoretical. */
    public const CARD_SUCCESS = '4242424242424242';
    public const CARD_DECLINED = '4000000000000002';
    public const CARD_ERROR = '4000000000000119';
    public const CARD_PENDING = '4000000000001001';
    public const CARD_UNKNOWN = '4000000000001002';
    public const CARD_CANCELLED = '4000000000001003';

    public function __construct()
    {
        if (app()->environment('production') && ! config('payments.allow_mock_in_production')) {
            throw new RuntimeException(
                'MockPaymentGateway must never run in production: it credits driver '
                    . 'balances for money that was never collected. Set '
                    . 'PAYMENTS_ALLOW_MOCK_IN_PRODUCTION=true to override deliberately.'
            );
        }

        if (app()->environment('production')) {
            Log::warning(
                'MockPaymentGateway is ENABLED IN PRODUCTION. Card payments are simulated '
                    . 'and driver balances are being credited for money that was never '
                    . 'collected. Do not run payouts while this is on.'
            );
        }
    }

    public function name(): string
    {
        return self::NAME;
    }

    public function tokenizeCard(array $card): GatewayResult
    {
        $number = preg_replace('/\D/', '', (string) ($card['number'] ?? ''));

        if (strlen((string) $number) < 12) {
            return GatewayResult::declined(self::NAME, 'Invalid card number.');
        }

        return GatewayResult::success(self::NAME, 'tok_mock_' . bin2hex(random_bytes(12)));
    }

    public function capture(Payment $payment, PassengerPaymentMethod $method): GatewayResult
    {
        return match ($this->scenarioFor($method)) {
            self::CARD_DECLINED => GatewayResult::declined(
                self::NAME,
                'Card declined by issuer.'
            ),
            self::CARD_ERROR => GatewayResult::error(
                self::NAME,
                'Gateway temporarily unavailable.'
            ),
            self::CARD_PENDING => GatewayResult::pending(
                self::NAME,
                'pending_mock_' . bin2hex(random_bytes(12))
            ),
            self::CARD_UNKNOWN => GatewayResult::unknown(
                self::NAME,
                'Gateway response timed out; payment outcome is unknown.'
            ),
            self::CARD_CANCELLED => GatewayResult::cancelled(
                self::NAME,
                'Payment was cancelled.'
            ),
            default => GatewayResult::success(
                self::NAME,
                'cap_mock_' . bin2hex(random_bytes(12))
            ),
        };
    }

    public function refund(Payment $payment, string $amount): GatewayResult
    {
        return GatewayResult::success(self::NAME, 'ref_mock_' . bin2hex(random_bytes(12)));
    }

    /**
     * The stored token never contains the PAN, so the outcome is driven by the
     * last4 of the sample card the passenger registered.
     */
    private function scenarioFor(PassengerPaymentMethod $method): string
    {
        return match ($method->last4) {
            substr(self::CARD_DECLINED, -4) => self::CARD_DECLINED,
            substr(self::CARD_ERROR, -4) => self::CARD_ERROR,
            substr(self::CARD_PENDING, -4) => self::CARD_PENDING,
            substr(self::CARD_UNKNOWN, -4) => self::CARD_UNKNOWN,
            substr(self::CARD_CANCELLED, -4) => self::CARD_CANCELLED,
            default => self::CARD_SUCCESS,
        };
    }
}
