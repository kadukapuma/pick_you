<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('ratings')
            ->select('ride_id', DB::raw('MAX(id) as keep_id'))
            ->groupBy('ride_id')
            ->havingRaw('COUNT(*) > 1')
            ->orderBy('ride_id')
            ->each(function ($duplicate) {
                DB::table('ratings')
                    ->where('ride_id', $duplicate->ride_id)
                    ->where('id', '<>', $duplicate->keep_id)
                    ->delete();
            });

        Schema::table('ratings', function (Blueprint $table) {
            $table->unique('ride_id', 'ratings_ride_id_unique');
            $table->index('driver_id', 'ratings_driver_id_index');
            $table->index('passenger_id', 'ratings_passenger_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('ratings', function (Blueprint $table) {
            $table->dropUnique('ratings_ride_id_unique');
            $table->dropIndex('ratings_driver_id_index');
            $table->dropIndex('ratings_passenger_id_index');
        });
    }
};
