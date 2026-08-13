<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wallet_transactions', function (Blueprint $table) {
            $table->foreignId('ride_id')
                ->nullable()
                ->constrained('rides')
                ->nullOnDelete();

            $table->foreignId('payment_id')
                ->nullable()
                ->constrained('payments')
                ->nullOnDelete();

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('reference')->nullable()->unique();
            $table->string('status')->default('COMPLETED');
            $table->json('metadata')->nullable();
            $table->timestamp('expires_at')->nullable();

            $table->index(
                ['user_id', 'status'],
                'wallet_transactions_user_status_index'
            );
        });
    }

    public function down(): void
    {
        Schema::table('wallet_transactions', function (Blueprint $table) {
            $table->dropIndex(
                'wallet_transactions_user_status_index'
            );

            $table->dropUnique(
                'wallet_transactions_reference_unique'
            );

            $table->dropConstrainedForeignId('ride_id');
            $table->dropConstrainedForeignId('payment_id');
            $table->dropConstrainedForeignId('created_by');

            $table->dropColumn([
                'reference',
                'status',
                'metadata',
                'expires_at',
            ]);
        });
    }
};