<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_attempts', function (Blueprint $table) {
            $table->id();

            $table->foreignId('payment_id')
                ->constrained('payments')
                ->cascadeOnDelete();

            $table->unsignedInteger('attempt_number');

            $table->string('gateway');
            $table->string('merchant_order_id')->unique();

            $table->string('status');

            $table->string('gateway_reference')->nullable();
            $table->string('provider_status')->nullable();
            $table->string('failure_code')->nullable();
            $table->text('failure_reason')->nullable();

            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('LKR');

            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('expires_at')->nullable();

            $table->timestamps();

            $table->unique(
                ['payment_id', 'attempt_number'],
                'payment_attempt_number_unique'
            );

            $table->index(['payment_id', 'status']);
            $table->index(['gateway', 'gateway_reference']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_attempts');
    }
};
