<?php

namespace App\Services\Ledger;

use App\Models\JournalEntry;
use App\Models\JournalLine;
use App\Models\LedgerAccount;
use DomainException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * The only class permitted to write to the journal.
 *
 * Every entry is balanced, idempotent, and posted under deterministic lock
 * ordering. Nothing else in the application should touch journal_* tables.
 */
class LedgerService
{
    /**
     * Post a balanced journal entry.
     *
     * @param  array<int, array{account: string, debit?: string, credit?: string}>  $lines
     */
    public function post(
        string $type,
        string $idempotencyKey,
        string $description,
        array $lines,
        ?Model $reference = null,
        ?int $createdBy = null,
        ?string $gateway = null,
        ?int $reversesEntryId = null,
        bool $allowZero = false,
    ): JournalEntry {
        return DB::transaction(function () use (
            $type, $idempotencyKey, $description, $lines, $reference, $createdBy, $gateway, $reversesEntryId, $allowZero
        ) {
            // Idempotency first: a retried request, a duplicate webhook or a
            // re-queued job must not post the same money twice.
            $existing = JournalEntry::query()
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing) {
                return $existing;
            }

            $normalised = $this->normalise($lines);
            $this->assertBalanced($normalised, $allowZero);

            $accounts = $this->lockAccounts(array_column($normalised, 'account'));

            $entry = JournalEntry::create([
                'type' => $type,
                'idempotency_key' => $idempotencyKey,
                'description' => $description,
                'gateway' => $gateway,
                'reference_type' => $reference ? $reference::class : null,
                'reference_id' => $reference?->getKey(),
                'created_by' => $createdBy,
                'reverses_entry_id' => $reversesEntryId,
                'posted_at' => now(),
            ]);

            foreach ($normalised as $line) {
                $account = $accounts[$line['account']];

                // Credit-positive convention for every account type, so the sum of
                // all balances in the system is always exactly zero.
                $balanceAfter = Money::sub(
                    Money::add((string) $account->balance, $line['credit']),
                    $line['debit'],
                );

                JournalLine::create([
                    'journal_entry_id' => $entry->id,
                    'ledger_account_id' => $account->id,
                    'debit' => $line['debit'],
                    'credit' => $line['credit'],
                    'balance_after' => $balanceAfter,
                ]);

                $account->balance = $balanceAfter;
                $account->save();
            }

            return $entry;
        }, 3);
    }

    /**
     * Reverse an existing entry by posting its mirror image.
     */
    public function reverse(JournalEntry $entry, string $reason, ?int $createdBy = null): JournalEntry
    {
        $lines = $entry->lines()->with('account')->get()->map(fn (JournalLine $line) => [
            'account' => $line->account->code,
            'debit' => (string) $line->credit,
            'credit' => (string) $line->debit,
        ])->all();

        return $this->post(
            JournalEntry::TYPE_REVERSAL,
            "reversal:{$entry->id}",
            $reason,
            $lines,
            createdBy: $createdBy,
            reversesEntryId: $entry->id,
        );
    }

    public function balanceFor(string $accountCode): string
    {
        $account = LedgerAccount::query()->where('code', $accountCode)->first();

        return $account ? Money::of($account->balance) : '0.00';
    }

    /**
     * @param  array<int, array{account: string, debit?: string, credit?: string}>  $lines
     * @return array<int, array{account: string, debit: string, credit: string}>
     */
    private function normalise(array $lines): array
    {
        if ($lines === []) {
            throw new DomainException('A journal entry needs at least two lines.');
        }

        return array_map(function (array $line) {
            $debit = Money::of($line['debit'] ?? '0');
            $credit = Money::of($line['credit'] ?? '0');

            if (Money::isNegative($debit) || Money::isNegative($credit)) {
                throw new DomainException('Journal line amounts must be positive; swap debit and credit instead.');
            }

            if (! Money::isZero($debit) && ! Money::isZero($credit)) {
                throw new DomainException('A journal line cannot be both a debit and a credit.');
            }

            return [
                'account' => $line['account'],
                'debit' => $debit,
                'credit' => $credit,
            ];
        }, $lines);
    }

    /**
     * @param  array<int, array{account: string, debit: string, credit: string}>  $lines
     *
     * $allowZero exists for callers that need an audit record of "nothing
     * moved" - e.g. a cash ride settling at 0% commission, where the driver
     * owes nothing and is owed nothing, but the ride should still show up in
     * the ledger as settled. Defaults to false so every other caller keeps
     * the protection this guard exists for: catching an accidentally empty
     * entry from a calculation bug before it's posted.
     */
    private function assertBalanced(array $lines, bool $allowZero = false): void
    {
        $debits = '0.00';
        $credits = '0.00';

        foreach ($lines as $line) {
            $debits = Money::add($debits, $line['debit']);
            $credits = Money::add($credits, $line['credit']);
        }

        if (Money::cmp($debits, $credits) !== 0) {
            throw UnbalancedEntryException::forTotals($debits, $credits);
        }

        if (! $allowZero && Money::isZero($debits)) {
            throw new DomainException('Refusing to post a zero-value journal entry.');
        }
    }

    /**
     * Resolve accounts and lock them in a deterministic order.
     *
     * Ordering by id is what stops two concurrent settlements deadlocking when
     * they both touch REVENUE_COMMISSION alongside different driver accounts.
     *
     * @param  array<int, string>  $codes
     * @return array<string, LedgerAccount>
     */
    private function lockAccounts(array $codes): array
    {
        $codes = array_values(array_unique($codes));

        foreach ($codes as $code) {
            $this->resolveAccount($code);
        }

        $accounts = LedgerAccount::query()
            ->whereIn('code', $codes)
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        return $accounts->keyBy('code')->all();
    }

    private function resolveAccount(string $code): LedgerAccount
    {
        $existing = LedgerAccount::query()->where('code', $code)->first();

        if ($existing) {
            return $existing;
        }

        if (str_starts_with($code, 'DRIVER:')) {
            $driverId = (int) substr($code, strlen('DRIVER:'));

            return LedgerAccount::query()->firstOrCreate(
                ['code' => $code],
                [
                    'type' => LedgerAccount::TYPE_LIABILITY,
                    'owner_type' => \App\Models\Driver::class,
                    'owner_id' => $driverId,
                    'balance' => 0,
                ],
            );
        }

        $type = LedgerAccount::COMPANY_ACCOUNTS[$code] ?? null;

        if ($type === null) {
            throw new DomainException("Unknown ledger account: {$code}.");
        }

        return LedgerAccount::query()->firstOrCreate(
            ['code' => $code],
            ['type' => $type, 'balance' => 0],
        );
    }
}
