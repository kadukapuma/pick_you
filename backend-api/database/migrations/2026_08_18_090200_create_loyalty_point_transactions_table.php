<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Audit trail for student loyalty points earned per ride, mirrors how
     * commission settlement is recorded on the ledger side.
     */
    public function up(): void
    {
        Schema::create('loyalty_point_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('passenger_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ride_id')->constrained()->cascadeOnDelete();
            $table->decimal('points', 10, 2);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_point_transactions');
    }
};
