<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fare_configs', function (Blueprint $table) {
            // Fraction of the fare, e.g. 0.10 for 10%. Null means "admin hasn't
            // set a student rate for this vehicle type yet" - treated as 0%
            // (no commission taken, no points earned) until configured.
            $table->decimal('student_commission_rate', 5, 4)->nullable()->after('commission_rate');
        });
    }

    public function down(): void
    {
        Schema::table('fare_configs', function (Blueprint $table) {
            $table->dropColumn('student_commission_rate');
        });
    }
};
