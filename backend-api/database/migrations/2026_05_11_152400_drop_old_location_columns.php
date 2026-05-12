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
        // Drop old columns from driver_locations
        Schema::table('driver_locations', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude']);
        });

        // Drop old columns from rides
        Schema::table('rides', function (Blueprint $table) {
            $table->dropColumn(['pickup_lat', 'pickup_lng', 'drop_lat', 'drop_lng']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('driver_locations', function (Blueprint $table) {
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 10, 8)->nullable();
        });

        Schema::table('rides', function (Blueprint $table) {
            $table->decimal('pickup_lat', 10, 8)->nullable();
            $table->decimal('pickup_lng', 10, 8)->nullable();
            $table->decimal('drop_lat', 10, 8)->nullable();
            $table->decimal('drop_lng', 10, 8)->nullable();
        });
    }
};
