<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PassengerPaymentMethod;
use App\Services\Payments\PaymentGateway;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PassengerPaymentMethodController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly PaymentGateway $gateway) {}

    public function index(Request $request)
    {
        $passenger = $request->user()->passenger;

        if (! $passenger) {
            return $this->error('Passenger not found', 404);
        }

        $methods = PassengerPaymentMethod::query()
            ->where('passenger_id', $passenger->id)
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->get();

        return $this->success($methods, 'Payment methods retrieved successfully.');
    }

    public function store(Request $request)
    {
        $passenger = $request->user()->passenger;

        if (! $passenger) {
            return $this->error('Passenger not found', 404);
        }

        $validated = $request->validate([
            'number' => 'required|string|min:12|max:24',
            'exp_month' => 'required|integer|min:1|max:12',
            'exp_year' => 'required|integer|min:2026|max:2100',
            'cvv' => 'sometimes|string|min:3|max:4',
            'brand' => 'sometimes|string|max:32',
            'is_default' => 'sometimes|boolean',
        ]);

        $number = preg_replace('/\D/', '', $validated['number']);

        $result = $this->gateway->tokenizeCard([
            'number' => $number,
            'exp_month' => (int) $validated['exp_month'],
            'exp_year' => (int) $validated['exp_year'],
            'cvv' => $validated['cvv'] ?? null,
        ]);

        if (! $result->successful) {
            return $this->error($result->failureReason ?: 'Could not save this card.', 422);
        }

        $method = DB::transaction(function () use ($passenger, $validated, $number, $result) {
            $makeDefault = (bool) ($validated['is_default'] ?? false)
                || ! PassengerPaymentMethod::where('passenger_id', $passenger->id)->exists();

            if ($makeDefault) {
                PassengerPaymentMethod::where('passenger_id', $passenger->id)
                    ->update(['is_default' => false]);
            }

            // Only the token and display metadata are stored - never the PAN.
            return PassengerPaymentMethod::create([
                'passenger_id' => $passenger->id,
                'gateway' => $result->gateway,
                'token' => $result->reference,
                'brand' => $validated['brand'] ?? null,
                'last4' => substr((string) $number, -4),
                'exp_month' => (int) $validated['exp_month'],
                'exp_year' => (int) $validated['exp_year'],
                'is_default' => $makeDefault,
            ]);
        });

        return $this->success($method, 'Card saved successfully.', 201);
    }

    public function setDefault(Request $request, $id)
    {
        $passenger = $request->user()->passenger;

        if (! $passenger) {
            return $this->error('Passenger not found', 404);
        }

        $method = PassengerPaymentMethod::where('passenger_id', $passenger->id)->find($id);

        if (! $method) {
            return $this->error('Payment method not found.', 404);
        }

        DB::transaction(function () use ($passenger, $method) {
            PassengerPaymentMethod::where('passenger_id', $passenger->id)
                ->update(['is_default' => false]);

            $method->update(['is_default' => true]);
        });

        return $this->success($method->refresh(), 'Default payment method updated.');
    }

    public function destroy(Request $request, $id)
    {
        $passenger = $request->user()->passenger;

        if (! $passenger) {
            return $this->error('Passenger not found', 404);
        }

        $method = PassengerPaymentMethod::where('passenger_id', $passenger->id)->find($id);

        if (! $method) {
            return $this->error('Payment method not found.', 404);
        }

        $method->delete();

        return $this->success(null, 'Payment method removed.');
    }
}
