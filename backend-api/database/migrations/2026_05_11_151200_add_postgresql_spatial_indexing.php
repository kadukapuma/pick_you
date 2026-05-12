<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add point column to driver_locations
        DB::statement("ALTER TABLE driver_locations ADD COLUMN location point");
        
        // Populate the location column from existing latitude and longitude
        DB::statement("UPDATE driver_locations SET location = point(longitude, latitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL");
        
        // Add GiST index for fast spatial lookups
        DB::statement("CREATE INDEX driver_locations_gist_index ON driver_locations USING gist (location)");

        // Add point columns to rides for pickup and drop
        DB::statement("ALTER TABLE rides ADD COLUMN pickup_point point");
        DB::statement("ALTER TABLE rides ADD COLUMN drop_point point");

        // Populate rides points
        DB::statement("UPDATE rides SET pickup_point = point(pickup_lng, pickup_lat) WHERE pickup_lat IS NOT NULL AND pickup_lng IS NOT NULL");
        DB::statement("UPDATE rides SET drop_point = point(drop_lng, drop_lat) WHERE drop_lat IS NOT NULL AND drop_lng IS NOT NULL");

        // Add GiST indexes for rides
        DB::statement("CREATE INDEX rides_pickup_gist_index ON rides USING gist (pickup_point)");
        DB::statement("CREATE INDEX rides_drop_gist_index ON rides USING gist (drop_point)");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("DROP INDEX IF EXISTS driver_locations_gist_index");
        DB::statement("ALTER TABLE driver_locations DROP COLUMN IF EXISTS location");

        DB::statement("DROP INDEX IF EXISTS rides_pickup_gist_index");
        DB::statement("DROP INDEX IF EXISTS rides_drop_gist_index");
        DB::statement("ALTER TABLE rides DROP COLUMN IF EXISTS pickup_point");
        DB::statement("ALTER TABLE rides DROP COLUMN IF EXISTS drop_point");
    }
};
