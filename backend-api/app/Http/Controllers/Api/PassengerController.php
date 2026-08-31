<?php

namespace App\Http\Controllers\Api;

use App\Events\DashboardUpdated;
use App\Events\PassengerCreated;
use App\Http\Controllers\Controller;
use App\Models\Passenger;
use App\Models\AdminNotificationLog;
use App\Services\Auth\NotifySmsSender;
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
        $search = trim((string) $request->input('search', $request->input('q', '')));

        $data = Passenger::with(['user', 'studentVerification'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('nic', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($uq) use ($search) {
                            $uq->where('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%")
                                ->orWhere('phone', 'like', "%{$search}%");
                        });
                });
            })
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
        $data = Passenger::with(['user', 'studentVerification'])->find($id);
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

        $passenger->user?->ensureRole('passenger', (bool) $request->is_active);

        event(new DashboardUpdated('passenger.account', [
            'passenger_id' => $passenger->id,
            'is_active' => (bool) $request->is_active,
        ]));

        return $this->success($passenger, 'Passenger status updated successfully.');
    }

    public function updateStudentStatus(Request $request, $id, NotifySmsSender $sms)
    {
        $request->validate([
            'status' => 'required|in:approved,rejected',
            'rejection_reason' => 'nullable|string|max:255',
        ]);

        $passenger = Passenger::with(['user', 'studentVerification'])->find($id);
        if (!$passenger) return $this->error('Passenger not found.', 404);

        $verification = $passenger->studentVerification;
        if (!$verification) return $this->error('No student application found for this passenger.', 404);

        $verification->update([
            'status' => $request->status,
            'rejection_reason' => $request->status === 'rejected' ? $request->rejection_reason : null,
            'reviewed_by' => $request->user()?->id,
            'reviewed_at' => now(),
        ]);

        if ($passenger->user?->phone) {
            $message = $request->status === 'approved'
                ? "Congratulations! You're now a verified Student Passenger on PickU. Enjoy loyalty points, exclusive offers and more on every ride."
                : "Your PickU student verification could not be approved at this time. You can review your details and re-apply from the app.";

            $sms->send($passenger->user->phone, $message);
        }

        event(new DashboardUpdated('passenger.student_status', [
            'passenger_id' => $passenger->id,
            'status' => $request->status,
        ]));

        return $this->success($passenger->fresh(['user', 'studentVerification']), "Student verification has been {$request->status}.");
    }
}
