<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('driver_locations', function (Blueprint $table) {
            if (! Schema::hasColumn('driver_locations', 'ride_id')) {
                $table->foreignId('ride_id')
                    ->nullable()
                    ->after('driver_id')
                    ->constrained()
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('driver_locations', function (Blueprint $table) {
            if (Schema::hasColumn('driver_locations', 'ride_id')) {
                $table->dropConstrainedForeignId('ride_id');
            }
        });
    }
};
