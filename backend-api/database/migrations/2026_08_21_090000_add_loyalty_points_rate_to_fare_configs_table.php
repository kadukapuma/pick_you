<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fare_configs', function (Blueprint $table) {
            // Fraction of the commission actually charged on a ride of this
            // vehicle type that is credited back to the passenger (any
            // passenger, including verified students) as loyalty points, e.g.
            // 0.10 = 10%. Null means "not configured yet" - treated as 0% (no
            // accrual) until an admin sets a rate. Independent of, and stacks
            // with, student_commission_rate's separate 100%-of-commission
            // student-only bonus.
            $table->decimal('loyalty_points_rate', 5, 4)->nullable()->after('student_commission_rate');
        });
    }

    public function down(): void
    {
        Schema::table('fare_configs', function (Blueprint $table) {
            $table->dropColumn('loyalty_points_rate');
        });
    }
};
