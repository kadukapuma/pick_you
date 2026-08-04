<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-driver policy for the commission account. Money itself lives in
     * ledger_accounts; this table only holds the business rules.
     */
    public function up(): void
    {
        Schema::create('driver_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('ledger_account_id')->constrained();
            $table->decimal('commission_rate', 5, 4)->nullable();   // per-driver override
            $table->decimal('credit_limit', 12, 2)->default(-2000); // blocked below this
            $table->boolean('is_blocked')->default(false);
            $table->string('block_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_accounts');
    }
};
