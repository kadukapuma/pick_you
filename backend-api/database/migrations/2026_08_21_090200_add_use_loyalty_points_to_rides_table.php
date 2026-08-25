<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Re-adds loyalty_points_used (dropped in 2026_08_20_120000, when
     * redemption was shelved) alongside a use_loyalty_points opt-in flag that
     * mirrors use_wallet_credit exactly.
     */
    public function up(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->boolean('use_loyalty_points')->default(false)->after('use_wallet_credit');
            $table->decimal('loyalty_points_used', 10, 2)->default(0)->after('use_loyalty_points');
        });
    }

    public function down(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->dropColumn(['use_loyalty_points', 'loyalty_points_used']);
        });
    }
};
