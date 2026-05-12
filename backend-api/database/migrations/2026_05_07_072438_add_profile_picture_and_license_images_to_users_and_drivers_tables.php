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
        Schema::table('users', function (Blueprint $table) {
            $table->string('profile_picture_path')->nullable()->after('role');
        });

        Schema::table('drivers', function (Blueprint $table) {
            $table->string('license_front_path')->nullable()->after('license_number');
            $table->string('license_back_path')->nullable()->after('license_front_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('profile_picture_path');
        });

        Schema::table('drivers', function (Blueprint $table) {
            $table->dropColumn(['license_front_path', 'license_back_path']);
        });
    }
};
