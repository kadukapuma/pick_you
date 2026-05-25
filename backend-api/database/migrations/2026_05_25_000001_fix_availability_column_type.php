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
        // First, update existing string values to integers
        DB::statement("UPDATE drivers SET availability = CASE
            WHEN availability = 'online' THEN '1'
            WHEN availability = 'offline' THEN '0'
            ELSE availability
        END");

        // Change the column type to integer using USING clause for PostgreSQL
        DB::statement("ALTER TABLE drivers ALTER COLUMN availability TYPE integer USING availability::integer");

        // Set default value
        DB::statement("ALTER TABLE drivers ALTER COLUMN availability SET DEFAULT 0");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE drivers ALTER COLUMN availability TYPE varchar USING availability::text");
        DB::statement("ALTER TABLE drivers ALTER COLUMN availability SET DEFAULT 'offline'");
    }
};
