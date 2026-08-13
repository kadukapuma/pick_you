<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_allocations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('payment_id')
                ->constrained('payments')
                ->cascadeOnDelete();

            $table->string('type');
            $table->decimal('amount', 10, 2);
            $table->string('status');

            $table->string('reference')->nullable()->unique();
            $table->json('metadata')->nullable();

            $table->timestamp('reserved_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('released_at')->nullable();

            $table->timestamps();

            $table->unique(
                ['payment_id', 'type'],
                'payment_allocation_type_unique'
            );

            $table->index(
                ['payment_id', 'status'],
                'payment_allocation_status_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_allocations');
    }
};
