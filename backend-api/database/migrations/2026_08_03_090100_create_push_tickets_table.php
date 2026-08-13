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
        Schema::create('push_tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_token_id')->constrained()->onDelete('cascade');
            $table->string('ticket_id');
            $table->timestamp('checked_at')->nullable();
            $table->timestamps();

            $table->index('ticket_id');
            $table->index('checked_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('push_tickets');
    }
};
