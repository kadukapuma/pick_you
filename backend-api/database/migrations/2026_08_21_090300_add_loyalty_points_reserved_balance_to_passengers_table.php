<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Mirrors wallet_reserved_balance: points that are reserved against an
     * in-flight payment but not yet consumed, so a passenger can't reserve
     * the same points against two concurrent payments.
     */
    public function up(): void
    {
        Schema::table('passengers', function (Blueprint $table) {
            $table->decimal('loyalty_points_reserved_balance', 10, 2)->default(0)->after('loyalty_points_balance');
        });
    }

    public function down(): void
    {
        Schema::table('passengers', function (Blueprint $table) {
            $table->dropColumn('loyalty_points_reserved_balance');
        });
    }
};
