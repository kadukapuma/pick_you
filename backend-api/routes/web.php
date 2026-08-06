<?php

use App\Http\Controllers\WebxpayCheckoutController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get(
    '/payments/webxpay/checkout/{attempt}',
    [WebxpayCheckoutController::class, 'show']
)
    ->middleware('signed:relative')
    ->name('webxpay.checkout');
