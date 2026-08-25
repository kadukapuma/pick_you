<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Raw phone number the user typed in as a referral/promotion code at
            // signup. Kept as entered for display/audit; referred_by_user_id below
            // is what the app actually joins on.
            $table->string('promo_code')->nullable()->after('phone_normalized');
            $table->foreignId('referred_by_user_id')->nullable()->after('promo_code')
                ->constrained('users')->nullOnDelete();
            $table->index('promo_code');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('referred_by_user_id');
            $table->dropIndex(['promo_code']);
            $table->dropColumn('promo_code');
        });
    }
};
