<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->string('trip_type')->default('oneway')->after('fare_id');
            $table->string('destination_address')->nullable()->after('trip_type');
            $table->decimal('destination_lat', 10, 8)->nullable()->after('destination_address');
            $table->decimal('destination_lng', 10, 8)->nullable()->after('destination_lat');
        });

        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        // Mirrors 2026_05_11_151200_add_postgresql_spatial_indexing.php (point) and
        // 2026_06_05_000001_enable_postgis_and_optimize_spatial_indexes.php (geography)
        // for pickup_point/pickup_geog — same pattern, one more location.
        DB::statement('ALTER TABLE rides ADD COLUMN IF NOT EXISTS destination_point point');
        DB::statement('ALTER TABLE rides ADD COLUMN IF NOT EXISTS destination_geog geography(Point, 4326)');

        DB::statement('CREATE INDEX IF NOT EXISTS rides_destination_geog_gist_idx ON rides USING gist (destination_geog)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS rides_destination_geog_gist_idx');
            DB::statement('ALTER TABLE rides DROP COLUMN IF EXISTS destination_geog');
            DB::statement('ALTER TABLE rides DROP COLUMN IF EXISTS destination_point');
        }

        Schema::table('rides', function (Blueprint $table) {
            $table->dropColumn(['trip_type', 'destination_address', 'destination_lat', 'destination_lng']);
        });
    }
};
