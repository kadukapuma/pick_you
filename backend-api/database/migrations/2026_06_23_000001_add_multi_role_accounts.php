<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Conflicting legacy identities remain null and are reported for manual resolution.
            $table->string('phone_normalized', 20)->nullable()->after('phone')->unique();
        });

        Schema::create('user_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 40);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['user_id', 'role']);
            $table->index(['role', 'is_active']);
        });

        Schema::create('driver_credentials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('login_email')->unique();
            $table->string('password');
            $table->timestamps();
        });

        Schema::create('pending_driver_enrollments', function (Blueprint $table) {
            $table->id();
            $table->string('token_hash', 64)->unique();
            $table->string('phone_normalized', 20)->index();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('login_email');
            $table->string('password');
            $table->timestamp('expires_at')->index();
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();
        });

        $normalizedGroups = [];
        DB::table('users')->select(['id', 'phone'])->orderBy('id')->get()->each(function ($user) use (&$normalizedGroups) {
            $normalized = $this->normalizePhone($user->phone);
            if ($normalized !== null) {
                $normalizedGroups[$normalized][] = (int) $user->id;
            }
        });

        foreach ($normalizedGroups as $normalized => $userIds) {
            if (count($userIds) === 1) {
                DB::table('users')->where('id', $userIds[0])->update(['phone_normalized' => $normalized]);
            } else {
                Log::warning('Multi-role migration found a normalized phone conflict.', [
                    'phone_normalized' => $normalized,
                    'user_ids' => $userIds,
                ]);
            }
        }

        DB::table('users')->select(['id', 'role'])->orderBy('id')->get()->each(function ($user) {
            if ($user->role) {
                DB::table('user_roles')->updateOrInsert(
                    ['user_id' => $user->id, 'role' => $user->role],
                    ['is_active' => true, 'created_at' => now(), 'updated_at' => now()],
                );
            }
        });

        $driverCredentialGroups = DB::table('drivers')
            ->join('users', 'users.id', '=', 'drivers.user_id')
            ->whereNotNull('users.email')
            ->whereNotNull('users.password')
            ->select(['drivers.id as driver_id', 'users.email', 'users.password'])
            ->orderBy('drivers.id')
            ->get()
            ->groupBy(fn ($row) => mb_strtolower(trim($row->email)));

        $driverCredentialGroups->each(function ($rows, $email) {
            if ($rows->count() > 1) {
                Log::warning('Multi-role migration found a driver login email conflict.', [
                    'login_email' => $email,
                    'driver_ids' => $rows->pluck('driver_id')->all(),
                ]);

                return;
            }
            $row = $rows->first();
            DB::table('driver_credentials')->updateOrInsert(
                ['driver_id' => $row->driver_id],
                [
                    'login_email' => $email,
                    'password' => $row->password,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            );
        });

        Schema::table('passengers', function (Blueprint $table) {
            $table->unique('user_id');
        });
        Schema::table('drivers', function (Blueprint $table) {
            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('drivers', fn (Blueprint $table) => $table->dropUnique(['user_id']));
        Schema::table('passengers', fn (Blueprint $table) => $table->dropUnique(['user_id']));
        Schema::dropIfExists('pending_driver_enrollments');
        Schema::dropIfExists('driver_credentials');
        Schema::dropIfExists('user_roles');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('phone_normalized'));
    }

    private function normalizePhone(?string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $phone);
        if (strlen($digits) === 10 && str_starts_with($digits, '0')) {
            $digits = '94'.substr($digits, 1);
        }

        return strlen($digits) === 11 && str_starts_with($digits, '94') ? $digits : null;
    }
};
