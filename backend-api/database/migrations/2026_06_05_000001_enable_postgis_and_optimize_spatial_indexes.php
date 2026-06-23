<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Enable PostGIS and add geography columns for meter-accurate radius search.
     */
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS postgis');

        DB::statement('
            CREATE UNIQUE INDEX IF NOT EXISTS driver_locations_driver_id_unique
            ON driver_locations (driver_id)
        ');

        DB::statement('ALTER TABLE driver_locations ADD COLUMN IF NOT EXISTS location_geog geography(Point, 4326)');

        DB::statement("
            UPDATE driver_locations
            SET location_geog = ST_SetSRID(ST_MakePoint((location)[0], (location)[1]), 4326)::geography
            WHERE location IS NOT NULL
              AND location_geog IS NULL
        ");

        DB::statement('CREATE INDEX IF NOT EXISTS driver_locations_location_geog_gist_idx ON driver_locations USING gist (location_geog)');

        DB::statement('ALTER TABLE rides ADD COLUMN IF NOT EXISTS pickup_geog geography(Point, 4326)');
        DB::statement('ALTER TABLE rides ADD COLUMN IF NOT EXISTS drop_geog geography(Point, 4326)');

        DB::statement("
            UPDATE rides
            SET pickup_geog = ST_SetSRID(ST_MakePoint((pickup_point)[0], (pickup_point)[1]), 4326)::geography
            WHERE pickup_point IS NOT NULL
              AND pickup_geog IS NULL
        ");

        DB::statement("
            UPDATE rides
            SET drop_geog = ST_SetSRID(ST_MakePoint((drop_point)[0], (drop_point)[1]), 4326)::geography
            WHERE drop_point IS NOT NULL
              AND drop_geog IS NULL
        ");

        DB::statement('CREATE INDEX IF NOT EXISTS rides_pickup_geog_gist_idx ON rides USING gist (pickup_geog)');

        DB::statement('DROP INDEX IF EXISTS drivers_active_available_index');
        DB::statement("
            CREATE INDEX drivers_active_available_index
            ON drivers (id)
            WHERE status = 'approved' AND availability = 1
        ");

        DB::statement('
            CREATE INDEX IF NOT EXISTS vehicles_driver_active_idx
            ON vehicles (driver_id, vehicle_type_id)
            WHERE is_active = true
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS vehicles_driver_active_idx');
        DB::statement('DROP INDEX IF EXISTS drivers_active_available_index');
        DB::statement("
            CREATE INDEX drivers_active_available_index
            ON drivers (status, availability)
            WHERE status = 'approved' AND availability = 'online'
        ");

        DB::statement('DROP INDEX IF EXISTS rides_pickup_geog_gist_idx');
        DB::statement('ALTER TABLE rides DROP COLUMN IF EXISTS drop_geog');
        DB::statement('ALTER TABLE rides DROP COLUMN IF EXISTS pickup_geog');

        DB::statement('DROP INDEX IF EXISTS driver_locations_location_geog_gist_idx');
        DB::statement('ALTER TABLE driver_locations DROP COLUMN IF EXISTS location_geog');
        DB::statement('DROP INDEX IF EXISTS driver_locations_driver_id_unique');
    }
};
