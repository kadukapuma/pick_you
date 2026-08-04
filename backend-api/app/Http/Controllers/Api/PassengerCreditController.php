<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Passenger;
use App\Models\WalletTransaction;
use App\Services\Payments\PassengerCreditService;
use App\Traits\ApiResponse;
use DomainException;
use Illuminate\Http\Request;
use Throwable;

class PassengerCreditController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly PassengerCreditService $credits,
    ) {}

        public function index(Request $request)
    {
        $passenger = $request->user()->passenger;

        if (! $passenger) {
            return $this->error(
                'Passenger profile not found.',
                404
            );
        }

        $transactions = WalletTransaction::query()
            ->where('user_id', $request->user()->id)
            ->latest('id')
            ->paginate(50);

        return $this->success([
            'available_balance' => $passenger->wallet_balance,
            'reserved_balance'
                => $passenger->wallet_reserved_balance,
            'transactions' => $transactions,
        ], 'Passenger credit balance retrieved successfully.');
    }

    public function store(
        Request $request,
        Passenger $passenger
    ) {
        $validated = $request->validate([
            'amount' => [
                'required',
                'numeric',
                'min:0.01',
                'max:100000',
            ],
            'reason' => [
                'required',
                'string',
                'max:500',
            ],
        ]);

        $idempotencyKey = trim(
            (string) $request->header('Idempotency-Key')
        );

        $reference = sprintf(
            'award:%d:%d:%s',
            $request->user()->id,
            $passenger->id,
            $idempotencyKey
        );

        try {
            $transaction = $this->credits->award(
                passenger: $passenger,
                amount: (string) $validated['amount'],
                createdBy: $request->user(),
                reason: $validated['reason'],
                reference: $reference,
            );
        } catch (DomainException $exception) {
            return $this->error($exception->getMessage(), 422);
        } catch (Throwable $exception) {
            report($exception);

            return $this->error(
                'Passenger credit could not be awarded.',
                500
            );
        }

        $passenger->refresh();

        return $this->success([
            'passenger_id' => $passenger->id,
            'wallet_balance' => $passenger->wallet_balance,
            'wallet_reserved_balance'
            => $passenger->wallet_reserved_balance,
            'transaction' => $transaction,
        ], 'Passenger credit awarded successfully.', 201);
    }
}
