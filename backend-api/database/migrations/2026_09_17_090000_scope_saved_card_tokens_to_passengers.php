<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('passenger_payment_methods', function (Blueprint $table) {
            $table->unique(['passenger_id', 'gateway', 'token'], 'passenger_payment_methods_owner_gateway_token_unique');
        });

        Schema::table('passenger_payment_methods', function (Blueprint $table) {
            $table->dropUnique(['gateway', 'token']);
        });
    }

    public function down(): void
    {
        if (DB::table('passenger_payment_methods')
            ->select('gateway', 'token')
            ->groupBy('gateway', 'token')
            ->havingRaw('COUNT(*) > 1')
            ->exists()) {
            throw new RuntimeException(
                'Cannot restore global card-token uniqueness: multiple passengers have the same provider token. No cards were removed.'
            );
        }

        Schema::table('passenger_payment_methods', function (Blueprint $table) {
            $table->unique(['gateway', 'token']);
        });

        Schema::table('passenger_payment_methods', function (Blueprint $table) {
            $table->dropUnique('passenger_payment_methods_owner_gateway_token_unique');
        });
    }
};
