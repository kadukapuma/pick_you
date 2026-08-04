<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // Which gateway settled this payment. Mock-settled payments credit driver
            // balances for money that was never collected, so they must stay
            // identifiable and reversible forever.
            $table->string('gateway')->nullable();
            $table->string('gateway_reference')->nullable();
            $table->string('failure_reason')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['gateway', 'gateway_reference', 'failure_reason']);
        });
    }
};
