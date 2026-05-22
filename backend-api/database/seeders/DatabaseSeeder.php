<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Fix standard seed which has broken column "name"
        User::updateOrCreate(
            ['phone' => '0771234567'],
            [
                'first_name' => 'Test',
                'last_name' => 'User',
                'email' => 'test@example.com',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'role' => User::ROLE_PASSENGER,
                'is_active' => true,
            ]
        );

        $defaultTypes = [
            [
                'name' => 'car',
                'display_name' => 'Car',
                'description' => 'Standard 4-seater cars and hatchbacks',
                'is_active' => true,
            ],
            [
                'name' => 'tuk',
                'display_name' => 'Tuk Tuk',
                'description' => 'Classic 3-wheeler auto rickshaws',
                'is_active' => true,
            ],
            [
                'name' => 'bike',
                'display_name' => 'Motorbike',
                'description' => 'Fast and efficient single-passenger motorbikes',
                'is_active' => true,
            ],
            [
                'name' => 'suv',
                'display_name' => 'SUV',
                'description' => 'Large 6-seater utility and family vehicles',
                'is_active' => true,
            ],
        ];

        foreach ($defaultTypes as $type) {
            \App\Models\VehicleType::updateOrCreate(['name' => $type['name']], $type);
        }
    }
}
