<?php

namespace App\Http\Controllers\Api;

use App\Events\DashboardUpdated;
use App\Events\PassengerCreated;
use App\Http\Controllers\Controller;
use App\Models\Passenger;
use App\Models\AdminNotificationLog;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class PassengerController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $perPage = $request->integer('per_page', 10);
        if ($perPage < 1) {
            $perPage = 10;
        }
        $perPage = min($perPage, 100);

        $data = Passenger::with('user')
            ->orderByDesc('id')
            ->paginate($perPage);

        return $this->success($data, 'Passenger list retrieved successfully.');
    }

    public function store(Request $request)
    {
        $data = Passenger::create($request->all());
        $passenger = Passenger::with('user')->find($data->id);

        if ($passenger) {
            event(new PassengerCreated($passenger));
        }

        $passengerName = $passenger?->user
            ? trim(($passenger->user->first_name ?? '') . ' ' . ($passenger->user->last_name ?? ''))
            : "Passenger #{$data->id}";
        if ($passengerName === '') {
            $passengerName = "Passenger #{$data->id}";
        }

        AdminNotificationLog::createAndBroadcast(
            'passenger',
            'New passenger added',
            "{$passengerName} profile created.",
            ['passenger_id' => $data->id, 'user_id' => $passenger?->user_id]
        );

        return $this->success($passenger, 'Passenger created successfully.', 201);
    }

    public function show($id)
    {
        $data = Passenger::find($id);
        if (!$data) return $this->error('Passenger not found.', 404);
        return $this->success($data, 'Passenger retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $data = Passenger::find($id);
        if (!$data) return $this->error('Passenger not found.', 404);
        $data->update($request->all());
        return $this->success($data, 'Passenger updated successfully.');
    }

    public function destroy($id)
    {
        $data = Passenger::find($id);
        if (!$data) return $this->error('Passenger not found.', 404);
        $data->delete();
        return $this->success(null, 'Passenger deleted successfully.');
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'is_active' => 'required|boolean'
        ]);

        $passenger = Passenger::with('user')->find($id);
        if (!$passenger) return $this->error('Passenger not found.', 404);

        if ($passenger->user) {
            $passenger->user->update(['is_active' => $request->is_active]);
        }

        event(new DashboardUpdated('passenger.account', [
            'passenger_id' => $passenger->id,
            'is_active' => (bool) $request->is_active,
        ]));

        return $this->success($passenger, 'Passenger status updated successfully.');
    }
}
