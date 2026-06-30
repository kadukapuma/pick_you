<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->timestamp('arrived_at')->nullable()->after('accepted_at');
            $table->decimal('estimated_distance_km', 10, 2)->default(0)->after('distance_km');
            $table->decimal('estimated_duration_minutes', 10, 2)->default(0)->after('estimated_distance_km');
            $table->decimal('actual_distance_km', 12, 4)->default(0)->after('estimated_duration_minutes');
            $table->decimal('actual_duration_minutes', 10, 2)->default(0)->after('actual_distance_km');
            $table->decimal('waiting_minutes', 10, 2)->default(0)->after('actual_duration_minutes');
            $table->decimal('chargeable_waiting_minutes', 10, 2)->default(0)->after('waiting_minutes');
            $table->decimal('extra_distance_km', 12, 4)->default(0)->after('chargeable_waiting_minutes');
            $table->decimal('extra_distance_fare', 10, 2)->default(0)->after('extra_distance_km');
            $table->decimal('waiting_fare', 10, 2)->default(0)->after('extra_distance_fare');
            $table->json('fare_breakdown')->nullable()->after('waiting_fare');
            $table->unsignedSmallInteger('fare_calculation_version')->default(1)->after('fare_breakdown');
            $table->unsignedBigInteger('last_processed_location_sequence')->nullable()->after('fare_calculation_version');
            $table->timestamp('last_processed_location_recorded_at')->nullable()->after('last_processed_location_sequence');
        });

        DB::table('rides')->update([
            'estimated_distance_km' => DB::raw('distance_km'),
        ]);

        Schema::table('driver_locations', function (Blueprint $table) {
            if (! Schema::hasColumn('driver_locations', 'latitude')) {
                $table->decimal('latitude', 10, 8)->nullable()->after('driver_id');
            }
            if (! Schema::hasColumn('driver_locations', 'longitude')) {
                $table->decimal('longitude', 10, 8)->nullable()->after('latitude');
            }
            $table->timestamp('recorded_at')->nullable()->after('speed');
            $table->unsignedBigInteger('sequence')->nullable()->after('recorded_at');
        });

        Schema::create('ride_location_points', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ride_id')->constrained()->cascadeOnDelete();
            $table->foreignId('driver_id')->constrained()->cascadeOnDelete();
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->decimal('accuracy', 8, 2)->nullable();
            $table->decimal('speed', 8, 2)->nullable();
            $table->decimal('heading', 6, 2)->nullable();
            $table->timestamp('recorded_at');
            $table->unsignedBigInteger('sequence')->nullable();
            $table->decimal('distance_from_previous_km', 12, 6)->default(0);
            $table->boolean('accepted_for_fare')->default(false);
            $table->string('rejection_reason')->nullable();
            $table->timestamps();

            $table->index(['ride_id', 'recorded_at'], 'ride_location_points_ride_recorded_idx');
            $table->index(['ride_id', 'sequence'], 'ride_location_points_ride_sequence_idx');
            $table->index(['driver_id', 'recorded_at'], 'ride_location_points_driver_recorded_idx');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("
                UPDATE driver_locations
                SET latitude = (location)[1], longitude = (location)[0]
                WHERE location IS NOT NULL
                  AND (latitude IS NULL OR longitude IS NULL)
            ");
            DB::statement('DROP INDEX IF EXISTS driver_locations_driver_id_unique');
            DB::statement('
                CREATE UNIQUE INDEX IF NOT EXISTS driver_locations_driver_latest_unique
                ON driver_locations (driver_id)
            ');
            DB::statement('
                CREATE UNIQUE INDEX IF NOT EXISTS ride_location_points_ride_driver_sequence_unique
                ON ride_location_points (ride_id, driver_id, sequence)
                WHERE sequence IS NOT NULL
            ');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS driver_locations_driver_latest_unique');
            DB::statement('
                CREATE UNIQUE INDEX IF NOT EXISTS driver_locations_driver_id_unique
                ON driver_locations (driver_id)
            ');
        }

        Schema::table('driver_locations', function (Blueprint $table) {
            $columns = ['recorded_at', 'sequence'];
            if (Schema::hasColumn('driver_locations', 'latitude')) {
                $columns[] = 'latitude';
            }
            if (Schema::hasColumn('driver_locations', 'longitude')) {
                $columns[] = 'longitude';
            }
            $table->dropColumn($columns);
        });

        Schema::dropIfExists('ride_location_points');

        Schema::table('rides', function (Blueprint $table) {
            $table->dropColumn([
                'estimated_distance_km',
                'estimated_duration_minutes',
                'actual_distance_km',
                'actual_duration_minutes',
                'waiting_minutes',
                'chargeable_waiting_minutes',
                'extra_distance_km',
                'extra_distance_fare',
                'waiting_fare',
                'fare_breakdown',
                'fare_calculation_version',
                'last_processed_location_sequence',
                'last_processed_location_recorded_at',
                'arrived_at',
            ]);
        });
    }
};
