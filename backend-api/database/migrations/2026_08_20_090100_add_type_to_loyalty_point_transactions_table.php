<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loyalty_point_transactions', function (Blueprint $table) {
            $table->enum('type', ['earned', 'redeemed', 'refunded'])
                ->default('earned')
                ->after('ride_id');
        });
    }

    public function down(): void
    {
        Schema::table('loyalty_point_transactions', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};
