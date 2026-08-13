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
        Schema::create('webxpay_token_payment_operations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('passenger_id')->constrained()->cascadeOnDelete();
            $table->foreignId('passenger_payment_method_id')
                ->constrained('passenger_payment_methods')->restrictOnDelete();
            $table->foreignId('payment_attempt_id')
                ->unique()->constrained('payment_attempts')->cascadeOnDelete();
            $table->string('customer_id');
            $table->string('customer_email');
            $table->string('callback_token_hash', 64);
            $table->string('status');
            $table->string('failure_code')->nullable();
            $table->text('failure_reason')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['passenger_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('webxpay_token_payment_operations');
    }
};
