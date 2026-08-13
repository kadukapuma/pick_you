<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->decimal('duration_overage_minutes', 10, 2)->default(0)->after('waiting_fare');
            $table->decimal('duration_overage_fare', 10, 2)->default(0)->after('duration_overage_minutes');
        });
    }

    public function down(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->dropColumn(['duration_overage_minutes', 'duration_overage_fare']);
        });
    }
};
