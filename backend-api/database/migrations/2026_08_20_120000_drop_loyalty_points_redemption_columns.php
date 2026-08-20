<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reverts the point-redemption columns added on 2026-08-20 - the feature was
 * replaced by a per-vehicle-type student_commission_rate on fare_configs
 * instead (points are only ever earned, never spent on a ride).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->dropColumn('loyalty_points_used');
        });

        Schema::table('loyalty_point_transactions', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }

    public function down(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->decimal('loyalty_points_used', 10, 2)
                ->default(0)
                ->after('use_wallet_credit');
        });

        Schema::table('loyalty_point_transactions', function (Blueprint $table) {
            $table->enum('type', ['earned', 'redeemed', 'refunded'])
                ->default('earned')
                ->after('ride_id');
        });
    }
};
