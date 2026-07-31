<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            // Chosen by the passenger at booking. Historical rides were all cash
            // in practice, so the default backfills them correctly.
            $table->string('payment_method')->default('cash');

            // Snapshotted at settlement so a later rate change never rewrites history.
            // NULL (not 0.00) means "no commission was ever applied to this ride",
            // which is how pre-cutoff rides stay distinguishable in reporting.
            $table->decimal('commission_rate', 5, 4)->nullable();
            $table->decimal('commission_amount', 10, 2)->nullable();
            $table->decimal('driver_earning', 10, 2)->nullable();
        });

        Schema::table('fare_configs', function (Blueprint $table) {
            $table->decimal('commission_rate', 5, 4)->nullable();  // per vehicle type override
        });
    }

    public function down(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->dropColumn(['payment_method', 'commission_rate', 'commission_amount', 'driver_earning']);
        });

        Schema::table('fare_configs', function (Blueprint $table) {
            $table->dropColumn('commission_rate');
        });
    }
};
