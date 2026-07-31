<?php

namespace Tests\Feature;

use App\Models\JournalEntry;
use App\Models\JournalLine;
use App\Models\LedgerAccount;
use App\Services\Ledger\LedgerService;
use App\Services\Ledger\UnbalancedEntryException;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class LedgerServiceTest extends TestCase
{
    use BuildsLedgerScenarios, RefreshDatabase;

    private function ledger(): LedgerService
    {
        return app(LedgerService::class);
    }

    public function test_posts_a_balanced_entry_and_updates_cached_balances(): void
    {
        $this->ledger()->post(
            type: JournalEntry::TYPE_RIDE_SETTLEMENT,
            idempotencyKey: 'test:1',
            description: 'Commission on a cash ride',
            lines: [
                ['account' => 'DRIVER:7', 'debit' => '60.00'],
                ['account' => 'REVENUE_COMMISSION', 'credit' => '60.00'],
            ],
        );

        $this->assertSame('-60.00', $this->ledger()->balanceFor('DRIVER:7'));
        $this->assertSame('60.00', $this->ledger()->balanceFor('REVENUE_COMMISSION'));
        $this->assertLedgerBalances();
    }

    public function test_rejects_an_unbalanced_entry(): void
    {
        $this->expectException(UnbalancedEntryException::class);

        $this->ledger()->post(
            type: JournalEntry::TYPE_ADJUSTMENT,
            idempotencyKey: 'test:unbalanced',
            description: 'Money from nowhere',
            lines: [
                ['account' => 'DRIVER:7', 'debit' => '60.00'],
                ['account' => 'REVENUE_COMMISSION', 'credit' => '50.00'],
            ],
        );
    }

    public function test_unbalanced_entry_leaves_no_partial_rows(): void
    {
        try {
            $this->ledger()->post(
                type: JournalEntry::TYPE_ADJUSTMENT,
                idempotencyKey: 'test:rollback',
                description: 'Should roll back',
                lines: [
                    ['account' => 'DRIVER:7', 'debit' => '60.00'],
                    ['account' => 'REVENUE_COMMISSION', 'credit' => '50.00'],
                ],
            );
        } catch (UnbalancedEntryException) {
            // expected
        }

        $this->assertSame(0, JournalEntry::count());
        $this->assertSame(0, JournalLine::count());
    }

    public function test_is_idempotent_on_repeated_keys(): void
    {
        $lines = [
            ['account' => 'DRIVER:7', 'debit' => '60.00'],
            ['account' => 'REVENUE_COMMISSION', 'credit' => '60.00'],
        ];

        $first = $this->ledger()->post(JournalEntry::TYPE_RIDE_SETTLEMENT, 'ride:1:settlement', 'x', $lines);
        $second = $this->ledger()->post(JournalEntry::TYPE_RIDE_SETTLEMENT, 'ride:1:settlement', 'x', $lines);

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, JournalEntry::count());
        // The money moved once, not twice.
        $this->assertSame('-60.00', $this->ledger()->balanceFor('DRIVER:7'));
    }

    public function test_rejects_a_line_that_is_both_debit_and_credit(): void
    {
        $this->expectException(DomainException::class);

        $this->ledger()->post(JournalEntry::TYPE_ADJUSTMENT, 'test:both', 'x', [
            ['account' => 'DRIVER:7', 'debit' => '10.00', 'credit' => '10.00'],
            ['account' => 'REVENUE_COMMISSION', 'credit' => '10.00'],
        ]);
    }

    public function test_rejects_negative_amounts(): void
    {
        $this->expectException(DomainException::class);

        $this->ledger()->post(JournalEntry::TYPE_ADJUSTMENT, 'test:negative', 'x', [
            ['account' => 'DRIVER:7', 'debit' => '-10.00'],
            ['account' => 'REVENUE_COMMISSION', 'credit' => '-10.00'],
        ]);
    }

    public function test_rejects_an_unknown_account_code(): void
    {
        $this->expectException(DomainException::class);

        $this->ledger()->post(JournalEntry::TYPE_ADJUSTMENT, 'test:unknown', 'x', [
            ['account' => 'NOT_A_REAL_ACCOUNT', 'debit' => '10.00'],
            ['account' => 'REVENUE_COMMISSION', 'credit' => '10.00'],
        ]);
    }

    public function test_journal_entries_are_immutable(): void
    {
        $entry = $this->ledger()->post(JournalEntry::TYPE_ADJUSTMENT, 'test:immutable', 'x', [
            ['account' => 'DRIVER:7', 'debit' => '10.00'],
            ['account' => 'REVENUE_COMMISSION', 'credit' => '10.00'],
        ]);

        $this->expectException(RuntimeException::class);

        $entry->update(['description' => 'tampered']);
    }

    public function test_journal_lines_are_immutable(): void
    {
        $this->ledger()->post(JournalEntry::TYPE_ADJUSTMENT, 'test:immutable-line', 'x', [
            ['account' => 'DRIVER:7', 'debit' => '10.00'],
            ['account' => 'REVENUE_COMMISSION', 'credit' => '10.00'],
        ]);

        $this->expectException(RuntimeException::class);

        JournalLine::first()->update(['debit' => '999.00']);
    }

    public function test_reversal_restores_the_original_balances(): void
    {
        $entry = $this->ledger()->post(JournalEntry::TYPE_RIDE_SETTLEMENT, 'ride:9:settlement', 'x', [
            ['account' => 'DRIVER:7', 'debit' => '60.00'],
            ['account' => 'REVENUE_COMMISSION', 'credit' => '60.00'],
        ]);

        $reversal = $this->ledger()->reverse($entry, 'Ride disputed');

        $this->assertSame('0.00', $this->ledger()->balanceFor('DRIVER:7'));
        $this->assertSame('0.00', $this->ledger()->balanceFor('REVENUE_COMMISSION'));
        $this->assertSame($entry->id, $reversal->reverses_entry_id);
        // The original survives for audit rather than being edited away.
        $this->assertSame(2, JournalEntry::count());
        $this->assertLedgerBalances();
    }

    public function test_driver_accounts_are_created_on_demand_with_the_right_type(): void
    {
        $this->ledger()->post(JournalEntry::TYPE_ADJUSTMENT, 'test:autocreate', 'x', [
            ['account' => 'DRIVER:42', 'debit' => '10.00'],
            ['account' => 'REVENUE_COMMISSION', 'credit' => '10.00'],
        ]);

        $account = LedgerAccount::where('code', 'DRIVER:42')->firstOrFail();

        $this->assertSame(LedgerAccount::TYPE_LIABILITY, $account->type);
        $this->assertSame(42, (int) $account->owner_id);
    }
}
