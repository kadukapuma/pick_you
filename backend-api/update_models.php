<?php
$models = [
    'DriverDocument' => [
        "    public function driver() { return \$this->belongsTo(Driver::class); }\n"
    ],
    'RideStatus' => [
        "    public function ride() { return \$this->belongsTo(Ride::class); }\n"
    ],
    'Payment' => [
        "    public function ride() { return \$this->belongsTo(Ride::class); }\n",
        "    public function passenger() { return \$this->belongsTo(Passenger::class); }\n"
    ],
    'WalletTransaction' => [
        "    public function user() { return \$this->belongsTo(User::class); }\n"
    ],
    'Rating' => [
        "    public function ride() { return \$this->belongsTo(Ride::class); }\n",
        "    public function passenger() { return \$this->belongsTo(Passenger::class); }\n",
        "    public function driver() { return \$this->belongsTo(Driver::class); }\n"
    ],
    'Promotion' => [
        "    public function ridePromotions() { return \$this->hasMany(RidePromotion::class); }\n"
    ],
    'RidePromotion' => [
        "    public function ride() { return \$this->belongsTo(Ride::class); }\n",
        "    public function promotion() { return \$this->belongsTo(Promotion::class); }\n"
    ],
    'DriverLocation' => [
        "    public function driver() { return \$this->belongsTo(Driver::class); }\n"
    ],
    'OtpVerification' => [
        "    public function user() { return \$this->belongsTo(User::class); }\n"
    ],
    'Notification' => [
        "    public function user() { return \$this->belongsTo(User::class); }\n"
    ],
    'SupportTicket' => [
        "    public function user() { return \$this->belongsTo(User::class); }\n"
    ],
    'FareConfig' => [
        "    public function rides() { return \$this->hasMany(Ride::class, 'fare_id'); }\n"
    ],
];

foreach ($models as $modelName => $relations) {
    $file = "app/Models/{$modelName}.php";
    if (file_exists($file)) {
        $content = file_get_contents($file);
        $relationStr = implode("", $relations);
        
        // Remove closing brace
        $content = preg_replace('/}\s*$/', '', $content);
        
        // Append relations and closing brace
        $content .= "\n" . $relationStr . "}\n";
        file_put_contents($file, $content);
        echo "Updated $modelName\n";
    }
}
