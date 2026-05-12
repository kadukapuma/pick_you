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
        Schema::create('rides', function (Blueprint $table) {
            $table->id();
            $table->string('ride_code')->unique();
            $table->foreignId('passenger_id')->constrained()->onDelete('cascade');
            $table->foreignId('driver_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('vehicle_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('fare_id')->constrained('fare_configs')->onDelete('cascade');
            $table->string('pickup_address');
            $table->decimal('pickup_lat', 10, 8)->nullable();
            $table->decimal('pickup_lng', 10, 8)->nullable();
            $table->string('drop_address');
            $table->decimal('drop_lat', 10, 8)->nullable();
            $table->decimal('drop_lng', 10, 8)->nullable();
            $table->decimal('distance_km', 10, 2)->default(0);
            $table->decimal('estimated_fare', 10, 2)->default(0);
            $table->decimal('final_fare', 10, 2)->default(0);
            $table->string('status');
            $table->timestamp('requested_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rides');
    }
};
