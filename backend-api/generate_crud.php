<?php

$controllers = [
    'PassengerController' => 'Passenger',
    'DriverController' => 'Driver',
    'VehicleController' => 'Vehicle',
    'DriverDocumentController' => 'DriverDocument',
    'RideStatusController' => 'RideStatus',
    'WalletTransactionController' => 'WalletTransaction',
    'RatingController' => 'Rating',
    'PromotionController' => 'Promotion',
    'RidePromotionController' => 'RidePromotion',
    'OtpVerificationController' => 'OtpVerification',
    'NotificationController' => 'Notification',
    'SupportTicketController' => 'SupportTicket',
    'FareConfigController' => 'FareConfig',
];

foreach ($controllers as $controllerClass => $modelClass) {
    $file = "app/Http/Controllers/Api/{$controllerClass}.php";
    if (file_exists($file)) {
        // Skip controllers we already customized
        if (in_array($controllerClass, ['RideController', 'DriverLocationController', 'PaymentController'])) continue;

        $content = "<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\\{$modelClass};
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class {$controllerClass} extends Controller
{
    use ApiResponse;

    public function index()
    {
        \$data = {$modelClass}::all();
        return \$this->success(\$data, '{$modelClass} list retrieved successfully.');
    }

    public function store(Request \$request)
    {
        \$data = {$modelClass}::create(\$request->all());
        return \$this->success(\$data, '{$modelClass} created successfully.', 201);
    }

    public function show(\$id)
    {
        \$data = {$modelClass}::find(\$id);
        if (!\$data) return \$this->error('{$modelClass} not found.', 404);
        return \$this->success(\$data, '{$modelClass} retrieved successfully.');
    }

    public function update(Request \$request, \$id)
    {
        \$data = {$modelClass}::find(\$id);
        if (!\$data) return \$this->error('{$modelClass} not found.', 404);
        \$data->update(\$request->all());
        return \$this->success(\$data, '{$modelClass} updated successfully.');
    }

    public function destroy(\$id)
    {
        \$data = {$modelClass}::find(\$id);
        if (!\$data) return \$this->error('{$modelClass} not found.', 404);
        \$data->delete();
        return \$this->success(null, '{$modelClass} deleted successfully.');
    }
}
";
        file_put_contents($file, $content);
        echo "Updated $controllerClass\n";
    }
}
