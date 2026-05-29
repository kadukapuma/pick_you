<?php
$vehicleTypes = \App\Models\VehicleType::where("is_active", true)->pluck("name");
foreach ($vehicleTypes as $vt) {
    if (!\App\Models\FareConfig::where("vehicle_type", $vt)->exists()) {
        \App\Models\FareConfig::create([
            "vehicle_type" => $vt,
            "base_fare" => rand(100, 200),
            "per_km_rate" => rand(50, 100),
            "per_minute_rate" => 5,
            "cancellation_fee" => 50,
            "is_active" => true
        ]);
        echo "Created fare config for $vt\n";
    }
}
