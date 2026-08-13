<?php

namespace Tests\Feature;

use App\Enums\PaymentStatus;
use App\Models\JournalEntry;
use App\Models\Passenger;
use App\Models\Payment;
use App\Models\PaymentRefund;
use App\Models\RolePermission;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\Payments\PickuCreditRefundService;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class PickuCreditRefundTest extends TestCase
{
    use BuildsLedgerScenarios;
    use RefreshDatabase;

    public function test_completed_payment_is_refunded_as_picku_credit_without_changing_payment_or_settlement(): void
    {
        [$payment, $passenger, $admin] = $this->makePayment('500.00');
        $settlementCount = JournalEntry::query()
            ->where('type', JournalEntry::TYPE_RIDE_SETTLEMENT)
            ->count();

        $refund = app(PickuCreditRefundService::class)->refund(
            payment: $payment,
            amount: '125.50',
            requestedBy: $admin,
            reason: 'Service recovery.',
            idempotencyKey: 'refund-payment-1',
        );

        $this->assertSame(PaymentRefund::STATUS_COMPLETED, $refund->status);
        $this->assertSame(PaymentRefund::DESTINATION_PICKU_CREDIT, $refund->destination);
        $this->assertSame('125.50', $refund->amount);
        $this->assertNotNull($refund->completed_at);
        $this->assertSame('10125.50', $passenger->fresh()->wallet_balance);
        $this->assertSame(PaymentStatus::COMPLETED->value, $payment->fresh()->payment_status);
        $this->assertSame(
            $settlementCount,
            JournalEntry::query()->where('type', JournalEntry::TYPE_RIDE_SETTLEMENT)->count()
        );
        $this->assertDatabaseHas('wallet_transactions', [
            'id' => $refund->wallet_transaction_id,
            'transaction_type' => WalletTransaction::TYPE_CREDIT_AWARD,
            'amount' => '125.50',
        ]);
        $this->assertLedgerBalances();
    }

    public function test_same_idempotency_key_does_not_refund_twice(): void
    {
        [$payment, $passenger, $admin] = $this->makePayment('500.00');
        $service = app(PickuCreditRefundService::class);

        $first = $service->refund($payment, '100.00', $admin, 'Delay.', 'same-refund');
        $second = $service->refund($payment, '100.00', $admin, 'Delay.', 'same-refund');

        $this->assertSame($first->id, $second->id);
        $this->assertSame('10100.00', $passenger->fresh()->wallet_balance);
        $this->assertSame(1, PaymentRefund::count());
        $this->assertSame(1, WalletTransaction::count());
    }

    public function test_total_credit_refunds_cannot_exceed_payment_amount(): void
    {
        [$payment, $passenger, $admin] = $this->makePayment('500.00');
        $service = app(PickuCreditRefundService::class);
        $service->refund($payment, '400.00', $admin, 'First refund.', 'refund-first');

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Refund amount exceeds');

        try {
            $service->refund($payment, '100.01', $admin, 'Too much.', 'refund-too-much');
        } finally {
            $this->assertSame('10400.00', $passenger->fresh()->wallet_balance);
            $this->assertSame(1, PaymentRefund::count());
        }
    }

    public function test_incomplete_payment_cannot_be_refunded(): void
    {
        [$payment, $passenger, $admin] = $this->makePayment('500.00');
        $payment->update(['payment_status' => PaymentStatus::FAILED->value]);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Only completed payments');

        try {
            app(PickuCreditRefundService::class)->refund(
                $payment,
                '100.00',
                $admin,
                'Invalid refund.',
                'failed-payment-refund',
            );
        } finally {
            $this->assertSame('10000.00', $passenger->fresh()->wallet_balance);
            $this->assertSame(0, PaymentRefund::count());
        }
    }

    public function test_authorized_admin_can_refund_payment_as_picku_credit(): void
    {
        [$payment, $passenger, $admin] = $this->makePayment('500.00');
        RolePermission::create([
            'role' => User::ROLE_ADMIN,
            'permission' => 'manage_passenger_credits',
        ]);
        Sanctum::actingAs($admin, ['role:admin']);

        $this->postJson(
            "/api/payments/{$payment->id}/credit-refunds",
            ['amount' => '75.25', 'reason' => 'Late pickup compensation.'],
            ['Idempotency-Key' => 'api-refund-1'],
        )
            ->assertCreated()
            ->assertJsonPath('data.refund.status', PaymentRefund::STATUS_COMPLETED)
            ->assertJsonPath('data.refund.destination', PaymentRefund::DESTINATION_PICKU_CREDIT)
            ->assertJsonPath('data.payment_status', PaymentStatus::COMPLETED->value)
            ->assertJsonPath('data.wallet_balance', '10075.25');

        $this->assertSame('10075.25', $passenger->fresh()->wallet_balance);
        $this->assertSame(1, PaymentRefund::count());
    }

    public function test_passenger_cannot_create_a_payment_refund(): void
    {
        [$payment] = $this->makePayment('500.00');
        [$passengerUser] = $this->makePassenger('0771234599');
        Sanctum::actingAs($passengerUser, ['role:passenger']);

        $this->postJson(
            "/api/payments/{$payment->id}/credit-refunds",
            ['amount' => '75.25', 'reason' => 'Unauthorized.'],
            ['Idempotency-Key' => 'unauthorized-refund'],
        )->assertForbidden();

        $this->assertSame(0, PaymentRefund::count());
    }

    public function test_passenger_ride_receipt_exposes_only_safe_refund_history(): void
    {
        [$payment, $passenger, $admin] = $this->makePayment('500.00');
        $refund = app(PickuCreditRefundService::class)->refund(
            $payment,
            '80.00',
            $admin,
            'Pickup delay.',
            'receipt-refund-safe',
        );
        Sanctum::actingAs($passenger->user, ['role:passenger']);

        $response = $this->getJson("/api/rides/{$payment->ride_id}")
            ->assertOk()
            ->assertJsonPath('data.payment.refunds.0.id', $refund->id)
            ->assertJsonPath('data.payment.refunds.0.amount', '80.00')
            ->assertJsonPath(
                'data.payment.refunds.0.destination',
                PaymentRefund::DESTINATION_PICKU_CREDIT
            )
            ->assertJsonPath('data.payment.refunds.0.reason', 'Pickup delay.');

        $payload = $response->json('data.payment.refunds.0');
        $this->assertArrayNotHasKey('idempotency_key', $payload);
        $this->assertArrayNotHasKey('requested_by', $payload);
        $this->assertArrayNotHasKey('failure_reason', $payload);
        $this->assertArrayNotHasKey('wallet_transaction_id', $payload);
    }

    public function test_authorized_admin_can_review_refundable_payment_balance(): void
    {
        [$payment, , $admin] = $this->makePayment('500.00');
        RolePermission::create([
            'role' => User::ROLE_ADMIN,
            'permission' => 'manage_passenger_credits',
        ]);
        app(PickuCreditRefundService::class)->refund(
            $payment,
            '125.00',
            $admin,
            'Partial refund.',
            'refund-summary-test',
        );
        Sanctum::actingAs($admin, ['role:admin']);

        $this->getJson("/api/payments/{$payment->id}/credit-refunds")
            ->assertOk()
            ->assertJsonPath('data.payment.id', $payment->id)
            ->assertJsonPath('data.payment.payment_status', PaymentStatus::COMPLETED->value)
            ->assertJsonPath('data.refunded_amount', '125.00')
            ->assertJsonPath('data.refundable_amount', '375.00')
            ->assertJsonPath('data.refunds.0.reason', 'Partial refund.');
    }

    public function test_authorized_admin_can_find_payment_by_passenger_identity(): void
    {
        [$payment, $passenger, $admin] = $this->makePayment('500.00');
        RolePermission::create([
            'role' => User::ROLE_ADMIN,
            'permission' => 'manage_passenger_credits',
        ]);
        Sanctum::actingAs($admin, ['role:admin']);

        $this->getJson('/api/payment-credit-refunds?query='.urlencode($passenger->user->email))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.payment_id', $payment->id)
            ->assertJsonPath('data.0.passenger_id', $passenger->id)
            ->assertJsonPath('data.0.refundable_amount', '500.00');
    }

    /** @return array{Payment, Passenger, User} */
    private function makePayment(string $amount): array
    {
        [, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $this->makeFareConfig(),
            (float) $amount,
            'card',
        );
        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => $amount,
            'transaction_id' => 'refund-test-'.uniqid(),
            'payment_status' => PaymentStatus::COMPLETED->value,
            'paid_at' => now(),
        ]);
        $admin = $this->makeUser(User::ROLE_ADMIN, '0770000099');
        $admin->ensureRole(User::ROLE_ADMIN);

        return [$payment, $passenger, $admin];
    }
}
