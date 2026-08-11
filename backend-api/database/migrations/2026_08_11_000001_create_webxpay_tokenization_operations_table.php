<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webxpay_tokenization_operations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('passenger_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->string('status', 32);
            $table->string('customer_id');
            $table->string('customer_email');
            $table->string('callback_token_hash', 64)->nullable();
            $table->string('failure_code')->nullable();
            $table->text('failure_reason')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['passenger_id', 'status']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webxpay_tokenization_operations');
    }
};
