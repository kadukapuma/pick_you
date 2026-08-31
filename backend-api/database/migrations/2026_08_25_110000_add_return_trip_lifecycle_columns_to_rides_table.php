<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            // One-way (pickup -> destination) estimate, stored alongside the
            // round-trip totals in estimated_distance_km/estimated_duration_minutes/
            // estimated_fare. Used as the fare floor when a return trip ends at the
            // destination instead of completing the return leg - see
            // FareCalculationService::completionBreakdown().
            $table->decimal('outbound_distance_km', 10, 2)->nullable()->after('destination_geog');
            $table->decimal('outbound_duration_minutes', 10, 2)->nullable()->after('outbound_distance_km');
            $table->decimal('outbound_fare', 10, 2)->nullable()->after('outbound_duration_minutes');

            // Return trip lifecycle: driver marks arrival at the destination
            // (STARTED -> WAITING), then either starts the return leg
            // (WAITING -> RETURNING) or the ride is completed directly from
            // WAITING (early end at the destination).
            $table->timestamp('destination_arrived_at')->nullable()->after('outbound_fare');
            $table->timestamp('return_started_at')->nullable()->after('destination_arrived_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->dropColumn([
                'outbound_distance_km',
                'outbound_duration_minutes',
                'outbound_fare',
                'destination_arrived_at',
                'return_started_at',
            ]);
        });
    }
};
