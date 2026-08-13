<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fare_configs', function (Blueprint $table) {
            $table->decimal('included_km', 10, 2)->default(0)->after('base_fare');
        });
    }

    public function down(): void
    {
        Schema::table('fare_configs', function (Blueprint $table) {
            $table->dropColumn('included_km');
        });
    }
};
