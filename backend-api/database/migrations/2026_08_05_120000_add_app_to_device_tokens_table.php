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
        Schema::table('device_tokens', function (Blueprint $table) {
            $table->string('app')->nullable()->after('platform');
        });

        // Attempt to classify existing tokens based on the primary user role
        try {
            DB::table('device_tokens')
                ->whereNull('app')
                ->whereIn('user_id', function ($query) {
                    $query->select('id')->from('users')->where('role', 'driver');
                })
                ->update(['app' => 'driver']);

            DB::table('device_tokens')
                ->whereNull('app')
                ->whereIn('user_id', function ($query) {
                    $query->select('id')->from('users')->where('role', 'passenger');
                })
                ->update(['app' => 'passenger']);
        } catch (\Throwable $e) {
            // Silence any issues during migration update
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('device_tokens', function (Blueprint $table) {
            $table->dropColumn('app');
        });
    }
};
