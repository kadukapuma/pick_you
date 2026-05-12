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
        // Partial index for active rides
        DB::statement("CREATE INDEX rides_active_status_index ON rides (status) WHERE status IN ('pending', 'accepted', 'ongoing')");

        // Partial index for active and available drivers
        DB::statement("CREATE INDEX drivers_active_available_index ON drivers (status, availability) WHERE status = 'approved' AND availability = 'online'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("DROP INDEX IF EXISTS rides_active_status_index");
        DB::statement("DROP INDEX IF EXISTS drivers_active_available_index");
    }
};
