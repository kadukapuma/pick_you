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
        // Add JSONB data column to settings
        Schema::table('settings', function (Blueprint $table) {
            $table->jsonb('settings_data')->nullable()->after('id');
        });

        // Add JSONB data column to notifications
        Schema::table('notifications', function (Blueprint $table) {
            $table->jsonb('data')->nullable()->after('message');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn('settings_data');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropColumn('data');
        });
    }
};
