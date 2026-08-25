<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Re-adds the `type` column dropped in 2026_08_20_120000 (redemption was
     * shelved at the time; it is being built now) and extends the table for
     * two accrual paths + real redemption:
     *
     * - payment_id: traces a 'redeemed' row back to the payment it was
     *   consumed against (mirrors WalletTransaction).
     * - source: which accrual rule produced an 'earned' row. Needed now that
     *   two independent paths (the existing student bonus and the new
     *   general per-vehicle-type accrual) both write 'earned' rows for the
     *   same ride.
     * - reference: idempotency key for redemption's reserve/consume/release
     *   lifecycle, mirroring WalletTransaction.reference.
     */
    public function up(): void
    {
        Schema::table('loyalty_point_transactions', function (Blueprint $table) {
            $table->foreignId('payment_id')->nullable()->after('ride_id')->constrained()->nullOnDelete();
            $table->enum('type', ['earned', 'redeemed', 'refunded'])->default('earned')->after('payment_id');
            $table->string('source')->nullable()->after('type');
            $table->string('reference')->nullable()->unique()->after('source');
        });
    }

    public function down(): void
    {
        Schema::table('loyalty_point_transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('payment_id');
            $table->dropColumn(['type', 'source', 'reference']);
        });
    }
};
