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
        Schema::table('drivers', function (Blueprint $table) {
            $table->renameColumn('status', 'availability');
        });
        
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropColumn('is_verified');
            $table->string('status')->default('pending')->after('vehicle_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropColumn('status');
            $table->boolean('is_verified')->default(false)->after('rating');
        });

        Schema::table('drivers', function (Blueprint $table) {
            $table->renameColumn('availability', 'status');
        });
    }
};
