<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WalletTransaction;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class WalletTransactionController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $data = WalletTransaction::where('user_id', $request->user()->id)->latest()->paginate(50);

        return $this->success($data, 'WalletTransaction list retrieved successfully.');
    }

    public function store(Request $request)
    {
        $data = WalletTransaction::create($request->all());

        return $this->success($data, 'WalletTransaction created successfully.', 201);
    }

    public function show(Request $request, $id)
    {
        $data = WalletTransaction::find($id);
        if (! $data) {
            return $this->error('WalletTransaction not found.', 404);
        }
        if ((int) $data->user_id !== (int) $request->user()->id) {
            return $this->error('You are not authorized to view this transaction.', 403);
        }

        return $this->success($data, 'WalletTransaction retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $data = WalletTransaction::find($id);
        if (! $data) {
            return $this->error('WalletTransaction not found.', 404);
        }
        $data->update($request->all());

        return $this->success($data, 'WalletTransaction updated successfully.');
    }

    public function destroy($id)
    {
        $data = WalletTransaction::find($id);
        if (! $data) {
            return $this->error('WalletTransaction not found.', 404);
        }
        $data->delete();

        return $this->success(null, 'WalletTransaction deleted successfully.');
    }
}
