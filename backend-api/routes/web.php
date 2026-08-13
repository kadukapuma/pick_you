<?php

use App\Http\Controllers\WebxpayCheckoutController;
use App\Http\Controllers\WebxpayTokenizationPageController;
use App\Http\Controllers\WebxpayTokenPaymentReturnController;
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

Route::get(
    '/payments/webxpay/cards/{operation}',
    [WebxpayTokenizationPageController::class, 'show']
)
    ->middleware('signed:relative')
    ->name('webxpay.tokenization.setup');

Route::post(
    '/payments/webxpay/cards/{operation}/session',
    [WebxpayTokenizationPageController::class, 'storeSession']
)
    ->middleware('signed:relative')
    ->name('webxpay.tokenization.session');

Route::get(
    '/payments/webxpay/cards/{operation}/return',
    [WebxpayTokenizationPageController::class, 'handleReturn']
)->name('webxpay.tokenization.return');

Route::get(
    '/payments/webxpay/token/{attempt}/return',
    [WebxpayTokenPaymentReturnController::class, 'handle']
)->name('webxpay.token-payment.return');
