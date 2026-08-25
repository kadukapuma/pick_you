<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pending_driver_enrollments', function (Blueprint $table) {
            $table->string('promo_code')->nullable()->after('phone_normalized');
        });
    }

    public function down(): void
    {
        Schema::table('pending_driver_enrollments', function (Blueprint $table) {
            $table->dropColumn('promo_code');
        });
    }
};
