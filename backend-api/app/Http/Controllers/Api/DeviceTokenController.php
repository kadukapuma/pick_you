<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeviceToken;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DeviceTokenController extends Controller
{
    use ApiResponse;

    /**
     * Register (or refresh) the authenticated user's push token for this device.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'platform' => 'nullable|string|in:ios,android,web',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        $deviceToken = DeviceToken::updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'token' => $request->token,
            ],
            [
                'platform' => $request->input('platform'),
            ],
        );

        return $this->success($deviceToken, 'Push token registered successfully');
    }

    /**
     * Remove a push token, e.g. on logout, so this device stops receiving pushes.
     */
    public function destroy(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        DeviceToken::where('user_id', $request->user()->id)
            ->where('token', $request->token)
            ->delete();

        return $this->success(null, 'Push token removed successfully');
    }
}
