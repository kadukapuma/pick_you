<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->boolean('use_wallet_credit')
                ->default(false)
                ->after('payment_method');
        });
    }

    public function down(): void
    {
        Schema::table('rides', function (Blueprint $table) {
            $table->dropColumn('use_wallet_credit');
        });
    }
};