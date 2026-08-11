<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('webxpay_token_payment_operations', function (Blueprint $table) {
            $table->dropForeign([
                'passenger_payment_method_id',
            ]);
        });

        Schema::table('webxpay_token_payment_operations', function (Blueprint $table) {
            $table->unsignedBigInteger('passenger_payment_method_id')
                ->nullable()
                ->change();

            $table->foreign('passenger_payment_method_id')
                ->references('id')
                ->on('passenger_payment_methods')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('webxpay_token_payment_operations', function (Blueprint $table) {
            $table->dropForeign([
                'passenger_payment_method_id',
            ]);

            $table->foreign('passenger_payment_method_id')
                ->references('id')
                ->on('passenger_payment_methods')
                ->restrictOnDelete();
        });
    }
};
