<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Populate vehicle_type_id if it's null by looking up from vehicle_types table
        $vehicles = DB::table('vehicles')->whereNull('vehicle_type_id')->get();
        foreach ($vehicles as $vehicle) {
            if (!empty($vehicle->vehicle_type)) {
                $type = DB::table('vehicle_types')->where('name', strtolower($vehicle->vehicle_type))->first();
                if ($type) {
                    DB::table('vehicles')->where('id', $vehicle->id)->update(['vehicle_type_id' => $type->id]);
                }
            }
        }

        // 2. Drop the vehicle_type column from vehicles table
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn('vehicle_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->string('vehicle_type')->nullable();
        });

        // Restore column values if possible
        $vehicles = DB::table('vehicles')->whereNotNull('vehicle_type_id')->get();
        foreach ($vehicles as $vehicle) {
            $type = DB::table('vehicle_types')->find($vehicle->vehicle_type_id);
            if ($type) {
                DB::table('vehicles')->where('id', $vehicle->id)->update(['vehicle_type' => $type->name]);
            }
        }
    }
};
