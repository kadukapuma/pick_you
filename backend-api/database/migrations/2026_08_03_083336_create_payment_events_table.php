<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_events', function (Blueprint $table) {
            $table->id();

            $table->foreignId('payment_id')
                ->constrained('payments')
                ->cascadeOnDelete();

            $table->foreignId('payment_attempt_id')
                ->nullable()
                ->constrained('payment_attempts')
                ->nullOnDelete();

            $table->string('event_type');
            $table->string('source');

            $table->string('provider_status')->nullable();
            $table->string('provider_reference')->nullable();

            $table->json('metadata')->nullable();

            $table->timestamps();

            $table->index(['payment_id', 'event_type']);
            $table->index(['payment_attempt_id', 'event_type']);
            $table->index(['source', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_events');
    }
};
