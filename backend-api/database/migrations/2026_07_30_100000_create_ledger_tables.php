<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Double-entry ledger backing driver commission and settlement.
     *
     * Balances are stored credit-positive for every account type, so the sum of
     * every account balance is always zero. That single invariant is what the
     * reconciliation command checks.
     */
    public function up(): void
    {
        Schema::create('ledger_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();            // DRIVER:17, REVENUE_COMMISSION
            $table->string('type');                      // asset|liability|revenue|equity
            $table->nullableMorphs('owner');             // Driver, or null for company accounts
            $table->decimal('balance', 14, 2)->default(0);
            $table->char('currency', 3)->default('LKR');
            $table->timestamps();
        });

        Schema::create('journal_entries', function (Blueprint $table) {
            $table->id();
            $table->string('type');                      // RIDE_SETTLEMENT|PAYOUT_REQUEST|...
            $table->nullableMorphs('reference');         // Ride, Payment, DriverPayout, ...
            $table->string('idempotency_key')->unique();
            $table->string('description');
            $table->string('gateway')->nullable();       // mock|payhere - which gateway produced this
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reverses_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->timestamp('posted_at');
            $table->timestamps();

            $table->index(['type', 'posted_at']);
        });

        Schema::create('journal_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journal_entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ledger_account_id')->constrained();
            $table->decimal('debit', 14, 2)->default(0);
            $table->decimal('credit', 14, 2)->default(0);
            $table->decimal('balance_after', 14, 2);
            $table->timestamps();

            $table->index(['ledger_account_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_lines');
        Schema::dropIfExists('journal_entries');
        Schema::dropIfExists('ledger_accounts');
    }
};
