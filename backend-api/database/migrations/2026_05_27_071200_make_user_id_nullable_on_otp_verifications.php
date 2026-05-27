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
        Schema::table('otp_verifications', function (Blueprint $table) {
            // Make user_id nullable if it's not already
            if (Schema::hasColumn('otp_verifications', 'user_id')) {
                $table->unsignedBigInteger('user_id')->nullable()->change();
            }

            // Add contact column if missing
            if (! Schema::hasColumn('otp_verifications', 'contact')) {
                $table->string('contact')->nullable()->after('user_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('otp_verifications', function (Blueprint $table) {
            if (Schema::hasColumn('otp_verifications', 'user_id')) {
                $table->unsignedBigInteger('user_id')->nullable(false)->change();
            }

            if (Schema::hasColumn('otp_verifications', 'contact')) {
                $table->dropColumn('contact');
            }
        });
    }
};
