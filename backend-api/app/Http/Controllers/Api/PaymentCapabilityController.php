<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class PaymentCapabilityController extends Controller
{
    public function show(): JsonResponse
    {
        $gateway = (string) config('payments.driver');

        $cardEnabled = $gateway === 'webxpay'
            && (bool) config('payments.webxpay.enabled');

        return response()->json([
            'cash' => true,
            'card' => $cardEnabled,
            'wallet' => false,
            'gateway' => $gateway,
            'environment' => app()->environment(),
        ]);
    }
}
