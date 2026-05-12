<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \App\Models\User::updateOrCreate(
            ['phone' => '0711234567'], // Hardcoded phone
            [
                'first_name' => 'Super',
                'last_name' => 'Admin',
                'email' => 'superadmin@pickyou.com',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'role' => \App\Models\User::ROLE_SUPER_ADMIN,
                'is_active' => true,
            ]
        );
    }
}
