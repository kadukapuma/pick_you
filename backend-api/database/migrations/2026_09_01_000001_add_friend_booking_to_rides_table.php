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
        Schema::table('rides', function (Blueprint $table) {
            // A passenger can book a ride for someone else - the friend is the
            // one picked up, but the booking passenger stays the payer/account
            // holder for wallet, loyalty, and rating purposes.
            $table->boolean('is_for_friend')->default(false)->after('drop_geog');
            $table->string('friend_name')->nullable()->after('is_for_friend');
            $table->string('friend_phone')->nullable()->after('friend_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->dropColumn(['is_for_friend', 'friend_name', 'friend_phone']);
        });
    }
};
