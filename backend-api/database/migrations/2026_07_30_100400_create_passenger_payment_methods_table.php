<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Stored cards. Only ever holds a gateway token plus display metadata -
     * never a PAN, CVV or expiry that could reconstruct the card.
     */
    public function up(): void
    {
        Schema::create('passenger_payment_methods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('passenger_id')->constrained()->cascadeOnDelete();
            $table->string('gateway');                   // mock|payhere
            $table->string('token');                     // tok_mock_...
            $table->string('brand')->nullable();         // visa|mastercard
            $table->string('last4', 4);
            $table->unsignedTinyInteger('exp_month');
            $table->unsignedSmallInteger('exp_year');
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->unique(['gateway', 'token']);
            $table->index(['passenger_id', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('passenger_payment_methods');
    }
};
