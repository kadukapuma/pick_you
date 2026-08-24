<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loyalty_point_transactions', function (Blueprint $table) {
            // Referral-bonus rows aren't tied to any ride.
            $table->foreignId('ride_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('loyalty_point_transactions', function (Blueprint $table) {
            $table->foreignId('ride_id')->nullable(false)->change();
        });
    }
};
