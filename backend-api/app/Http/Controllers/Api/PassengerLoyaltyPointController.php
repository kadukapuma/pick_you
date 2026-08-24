<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoyaltyPointTransaction;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class PassengerLoyaltyPointController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $passenger = $request->user()->passenger;

        if (! $passenger) {
            return $this->error(
                'Passenger profile not found.',
                404
            );
        }

        $transactions = LoyaltyPointTransaction::query()
            ->where('passenger_id', $passenger->id)
            ->latest('id')
            ->paginate(50);

        return $this->success([
            'available_balance' => $passenger->loyalty_points_balance,
            'reserved_balance' => $passenger->loyalty_points_reserved_balance,
            'transactions' => $transactions,
        ], 'Loyalty point balance retrieved successfully.');
    }
}
