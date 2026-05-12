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
        // Add full-text search index for Users
        DB::statement("CREATE INDEX users_name_search_index ON users USING gin(to_tsvector('english', first_name || ' ' || last_name))");
        
        // Add full-text search index for Passengers (if they have names in their own table, but usually they link to users)
        // Let's check passengers table
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("DROP INDEX IF EXISTS users_name_search_index");
    }
};
