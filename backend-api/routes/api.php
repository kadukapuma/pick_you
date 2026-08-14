<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminFinanceController;
use App\Http\Controllers\Api\AdminNotificationController;
use App\Http\Controllers\Api\AppSettingsController;
use App\Http\Controllers\Api\AppUpdateController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DeviceTokenController;
use App\Http\Controllers\Api\DriverAccountController;
use App\Http\Controllers\Api\DriverAuthController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\DriverDocumentController;
use App\Http\Controllers\Api\DriverLocationController;
use App\Http\Controllers\Api\DriverProfileController;
use App\Http\Controllers\Api\DriverRideHistoryController;
use App\Http\Controllers\Api\FareConfigController;
use App\Http\Controllers\Api\MapsController;
use App\Http\Controllers\Api\NearbyVehicleController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OperatorController;
use App\Http\Controllers\Api\PassengerAuthController;
use App\Http\Controllers\Api\PassengerController;
use App\Http\Controllers\Api\PassengerCreditController;
use App\Http\Controllers\Api\PassengerPaymentMethodController;
use App\Http\Controllers\Api\PassengerProfileController;
use App\Http\Controllers\Api\PassengerRideHistoryController;
use App\Http\Controllers\Api\PaymentCapabilityController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PaymentCreditRefundController;
use App\Http\Controllers\Api\PromotionController;
use App\Http\Controllers\Api\RatingController;
use App\Http\Controllers\Api\RideController;
use App\Http\Controllers\Api\RideLocationController;
use App\Http\Controllers\Api\RolePermissionController;
use App\Http\Controllers\Reports\DriverPerformanceReportController;
use App\Http\Controllers\Reports\ReportsOverviewController;
use App\Http\Controllers\Reports\RevenueReportController;
use App\Http\Controllers\Reports\RideHistoryReportController;
use App\Http\Controllers\Reports\TransactionReportController;
use App\Http\Controllers\Api\SuperAdminNotificationController;
use App\Http\Controllers\Api\SupportTicketController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\VehicleTypeController;
use App\Http\Controllers\Api\WalletTransactionController;
use App\Http\Controllers\Api\WebxpayReturnController;
use App\Http\Controllers\Api\WebxpaySavedCardController;
use App\Http\Controllers\Api\WebxpaySavedCardPaymentController;
use App\Services\Auth\AuthPayload;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('driver/auth')->middleware('throttle:auth')->group(function () {
    Route::post('/register', [DriverAuthController::class, 'register']);
    Route::post('/otp/send', [DriverAuthController::class, 'sendOtp']);
    Route::post('/otp/verify', [DriverAuthController::class, 'verifyOtp']);
    Route::post('/login', [DriverAuthController::class, 'login']);
});

// Passenger App Auth routes
Route::prefix('passenger/auth')->middleware('throttle:auth')->group(function () {
    Route::post('/otp/send', [PassengerAuthController::class, 'sendOtp']);
    Route::post('/otp/verify', [PassengerAuthController::class, 'verifyOtp']);
    Route::post('/register', [PassengerAuthController::class, 'completeRegistration']);
});
Route::middleware('auth:sanctum')->post('/passenger/auth/logout', [PassengerAuthController::class, 'logout']);

// Public routes
Route::get('/app-updates/{app}', [AppUpdateController::class, 'show'])->middleware('throttle:60,1');
Route::get('/app-downloads', [AppUpdateController::class, 'downloads'])->middleware('throttle:60,1');
Route::get('/app-downloads/{app}/download', [AppUpdateController::class, 'download'])
    ->middleware('throttle:30,1')->name('app-downloads.download');

Route::middleware('throttle:auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/otp/send', [AuthController::class, 'sendOtp']);
    Route::post('/otp/verify', [AuthController::class, 'verifyOtp']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/login/verify-2fa', [AuthController::class, 'verifySuperAdmin2FA']);
});

// Protected routes
Route::get(
    '/payment-capabilities',
    [PaymentCapabilityController::class, 'show']
)->middleware('throttle:60,1');
Route::post(
    '/payments/webxpay/return',
    [WebxpayReturnController::class, 'handle']
)->name('webxpay.return');
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request, AuthPayload $payload) {
        $user = $request->user();
        $activeRole = $user->activeRole();

        return response()->json($payload->for($user, $activeRole ?? $user->role)['user']);
    });
    Route::middleware('role:passenger')->group(function () {
        Route::get('/passenger/profile', [PassengerProfileController::class, 'getProfile']);
        Route::put('/passenger/profile', [PassengerProfileController::class, 'updateProfile']);
        Route::post('/passenger/profile-picture', [PassengerProfileController::class, 'updateProfilePicture']);
    });
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/user/profile-picture', [AuthController::class, 'updateProfilePicture']);
    Route::middleware('role:driver')->group(function () {
        Route::get('/driver/profile', [DriverProfileController::class, 'getProfile']);
        Route::put('/driver/profile', [DriverProfileController::class, 'updateProfile']);
        Route::post('/driver/profile/update-bank', [DriverProfileController::class, 'updateBank']);
        Route::post('/driver/complete-profile', [DriverController::class, 'completeProfile']);
        Route::post('/driver/license-images', [DriverController::class, 'updateLicenseImages']);
        Route::put('/driver/availability', [DriverController::class, 'updateOwnAvailability']);
    });

    Route::middleware('role:driver,admin,super_admin')->group(function () {
        Route::get('/vehicles', [VehicleController::class, 'index']);
        Route::post('/vehicles', [VehicleController::class, 'store']);
        Route::get('/vehicles/{id}', [VehicleController::class, 'show']);
        Route::put('/vehicles/{id}', [VehicleController::class, 'update']);
        Route::post('/vehicles/{id}/upload-images', [VehicleController::class, 'uploadImages']);
    });
    Route::middleware('role:driver')->group(function () {
        Route::get('/driver-documents', [DriverDocumentController::class, 'index']);
        Route::post('/driver-documents', [DriverDocumentController::class, 'store']);
        Route::get('/driver-documents/{id}', [DriverDocumentController::class, 'show']);
        Route::put('/driver-documents/{id}', [DriverDocumentController::class, 'update']);
        Route::delete('/driver-documents/{id}', [DriverDocumentController::class, 'destroy']);
    });
    Route::get('/vehicle-types', [VehicleTypeController::class, 'index']);
    Route::prefix('maps')->middleware('throttle:60,1')->group(function () {
        Route::get('/places/autocomplete', [MapsController::class, 'autocomplete']);
        Route::get('/places/details', [MapsController::class, 'details']);
        Route::post('/geocode/reverse', [MapsController::class, 'reverseGeocode']);
        Route::post('/routes', [MapsController::class, 'routes']);
    });
    Route::post('/rides/estimate', [RideController::class, 'estimate'])->middleware('role:passenger');
    Route::get('/nearby-vehicles', [NearbyVehicleController::class, 'index'])
        ->middleware(['role:passenger', 'throttle:60,1']);
    Route::post('/rides', [RideController::class, 'store'])->middleware(['role:passenger', 'idempotent']);
    Route::get('/rides', [PassengerRideHistoryController::class, 'index'])->middleware('role:passenger');
    Route::get('/rides/{id}', [RideController::class, 'show']);
    Route::delete('/rides/{id}', [RideController::class, 'destroy'])->middleware('idempotent');
    Route::post('/rides/{id}/cancel', [RideController::class, 'cancel'])->middleware('idempotent');
    Route::middleware('role:driver')->group(function () {
        Route::get('/driver/ride-requests', [RideController::class, 'driverRideRequests']);
        Route::get('/driver/rides', [DriverRideHistoryController::class, 'index']);
        Route::post('/rides/{id}/accept', [RideController::class, 'acceptRide'])->middleware('idempotent');
        Route::post('/rides/{id}/reject', [RideController::class, 'rejectRide'])->middleware('idempotent');
        Route::post('/rides/{id}/arrive', [RideController::class, 'arriveRide'])->middleware('idempotent');
        Route::post('/rides/{id}/start', [RideController::class, 'startRide'])->middleware('idempotent');
        Route::post('/rides/{id}/complete', [RideController::class, 'completeRide'])->middleware('idempotent');
        Route::post('/driver-locations', [DriverLocationController::class, 'store'])
            ->middleware('throttle:60,1');
        Route::get('/driver/account', [DriverAccountController::class, 'show']);
        Route::get('/driver/account/transactions', [DriverAccountController::class, 'transactions']);
        Route::get('/driver/earnings/summary', [DriverAccountController::class, 'earnings']);
    });
    Route::middleware('role:passenger')->group(function () {
        Route::get(
            '/passenger/credits',
            [PassengerCreditController::class, 'index']
        );
        Route::get('/payment-methods', [PassengerPaymentMethodController::class, 'index']);
        Route::get(
            '/payment-methods/webxpay',
            [WebxpaySavedCardController::class, 'index']
        );
        Route::post(
            '/payment-methods/webxpay/setup',
            [WebxpaySavedCardController::class, 'storeSetup']
        )->middleware('throttle:10,1');
        Route::delete(
            '/payment-methods/webxpay/{paymentMethod}',
            [WebxpaySavedCardController::class, 'destroy']
        )->whereNumber('paymentMethod')->middleware('throttle:10,1');
        Route::post('/payment-methods', [PassengerPaymentMethodController::class, 'store']);
        Route::post('/payment-methods/{id}/default', [PassengerPaymentMethodController::class, 'setDefault']);
        Route::delete('/payment-methods/{id}', [PassengerPaymentMethodController::class, 'destroy']);
    });
    Route::get('/rides/{id}/driver-location', [RideLocationController::class, 'show']);
    Route::get('/rides/{ride}/payment', [PaymentController::class, 'show']);
    Route::post(
        '/rides/{ride}/payments/webxpay/checkout',
        [PaymentController::class, 'createWebxpayCheckout']
    )->middleware([
        'role:passenger',
        'idempotent',
    ]);
    Route::post(
        '/rides/{ride}/payments/webxpay/attempts/{attempt}/saved-card',
        [WebxpaySavedCardPaymentController::class, 'store']
    )->middleware([
        'role:passenger',
        'idempotent',
        'throttle:webxpay-saved-card-payment',
    ]);
    Route::post('/payments/{ride_id}', [PaymentController::class, 'processPayment'])
        ->middleware(['role:passenger,driver,admin,super_admin', 'idempotent']);

    Route::get('/wallet-transactions', [WalletTransactionController::class, 'index']);
    Route::get('/wallet-transactions/{id}', [WalletTransactionController::class, 'show']);
    Route::post('/ratings', [RatingController::class, 'store'])->middleware('role:passenger');
    Route::get('/ratings/{id}', [RatingController::class, 'show']);
    Route::get('/promotions', [PromotionController::class, 'index']);
    Route::get('/promotions/{id}', [PromotionController::class, 'show']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/{id}', [NotificationController::class, 'show']);
    Route::post('/devices/push-token', [DeviceTokenController::class, 'store']);
    Route::delete('/devices/push-token', [DeviceTokenController::class, 'destroy']);
    Route::put('/notifications/{id}', [NotificationController::class, 'update']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
    Route::get('/support-tickets', [SupportTicketController::class, 'index']);
    Route::post('/support-tickets', [SupportTicketController::class, 'store']);
    Route::get('/support-tickets/{id}', [SupportTicketController::class, 'show']);

    Route::post(
        '/passengers/{passenger}/credits',
        [PassengerCreditController::class, 'store']
    )->middleware([
        'role:admin,super_admin,operator',
        'permission:manage_passenger_credits',
        'idempotent',
    ]);

    Route::post(
        '/payments/{payment}/credit-refunds',
        [PaymentCreditRefundController::class, 'store']
    )->middleware([
        'role:admin,super_admin,operator',
        'permission:manage_passenger_credits',
        'idempotent',
    ]);

    Route::get(
        '/payments/{payment}/credit-refunds',
        [PaymentCreditRefundController::class, 'show']
    )->middleware([
        'role:admin,super_admin,operator',
        'permission:manage_passenger_credits',
    ]);

    Route::get(
        '/payment-credit-refunds',
        [PaymentCreditRefundController::class, 'index']
    )->middleware([
        'role:admin,super_admin,operator',
        'permission:manage_passenger_credits',
    ]);
    // Admin routes

    Route::middleware('admin')->group(function () {
        // Admin notification routes require manage_notifications permission
        Route::middleware('permission:manage_notifications')->group(function () {
            Route::get('/admin/notifications', [AdminNotificationController::class, 'index']);
            Route::put('/admin/notifications/read', [AdminNotificationController::class, 'markAllRead']);
            Route::delete('/admin/notifications', [AdminNotificationController::class, 'clear']);
            Route::delete('/admin/notifications/read', [AdminNotificationController::class, 'clearRead']);
            Route::post('/admin/notifications/send-bulk', [AdminNotificationController::class, 'sendBulk']);
            Route::post('/admin/app-updates/{app}/publish', [AppUpdateController::class, 'publish']);
            Route::get('/admin/app-updates/{app}/release', [AppUpdateController::class, 'current']);
            Route::post('/admin/app-updates/{app}/apk', [AppUpdateController::class, 'upload']);
            Route::get('/admin/notifications/broadcasts', [AdminNotificationController::class, 'broadcasts']);
            Route::delete('/admin/notifications/broadcasts/{id}', [AdminNotificationController::class, 'deleteBroadcast']);
            Route::delete('/admin/notifications/broadcasts', [AdminNotificationController::class, 'clearBroadcasts']);
        });

        // Commission and driver settlement
        Route::get('/admin/finance/summary', [AdminFinanceController::class, 'summary']);
        Route::get('/admin/finance/driver-accounts', [AdminFinanceController::class, 'driverAccounts']);
        Route::get('/admin/finance/drivers/{driverId}/statement', [AdminFinanceController::class, 'driverStatement']);
        Route::post(
            '/admin/finance/drivers/{driverId}/settlements',
            [AdminFinanceController::class, 'settleDriver']
        )->middleware([
            'permission:manage_finance',
            'idempotent',
        ]);
        Route::post(
            '/admin/finance/drivers/{driverId}/payouts',
            [AdminFinanceController::class, 'payoutDriver']
        )->middleware([
            'permission:manage_finance',
            'idempotent',
        ]);
        Route::get('/admin/finance/trial-balance', [AdminFinanceController::class, 'trialBalance']);

        // Reports
        Route::get('/admin/reports/overview', [ReportsOverviewController::class, 'index']);
        Route::get('/admin/reports/vehicle-summary', [ReportsOverviewController::class, 'vehicleSummary']);
        Route::get('/admin/reports/ride-statistics', [ReportsOverviewController::class, 'rideStatistics']);
        Route::get('/admin/reports/payment-breakdown', [ReportsOverviewController::class, 'paymentBreakdown']);
        Route::get('/admin/reports/revenue/daily', [RevenueReportController::class, 'daily']);
        Route::get('/admin/reports/revenue/monthly', [RevenueReportController::class, 'monthly']);
        Route::get('/admin/reports/drivers/performance', [DriverPerformanceReportController::class, 'index']);
        Route::get('/admin/reports/drivers/earnings', [DriverPerformanceReportController::class, 'earnings']);
        Route::get('/admin/reports/transactions', [TransactionReportController::class, 'index']);
        Route::get('/admin/reports/ride-history', [RideHistoryReportController::class, 'index']);

        Route::get('/role-permissions', [RolePermissionController::class, 'index'])->middleware('super_admin');
        Route::put('/role-permissions/{role}', [RolePermissionController::class, 'update'])->middleware('super_admin');
        Route::get('/operators', [OperatorController::class, 'index'])->middleware('permission:create_operators,manage_operators');
        Route::post('/operators', [OperatorController::class, 'store'])->middleware('permission:create_operators');
        Route::put('/operators/{id}', [OperatorController::class, 'update'])->middleware('permission:manage_operators');
        Route::put('/operators/{id}/status', [OperatorController::class, 'updateStatus'])->middleware('permission:manage_operators');
        Route::delete('/operators/{id}', [OperatorController::class, 'destroy'])->middleware('permission:manage_operators');
        Route::apiResource('fare-configs', FareConfigController::class)->middleware('permission:manage_fare_configs');
        Route::apiResource('vehicle-types', VehicleTypeController::class)->except(['index'])->middleware('permission:manage_vehicle_types');

        // Vehicle management requires manage_vehicles permission
        Route::delete('/vehicles/{id}', [VehicleController::class, 'destroy'])->middleware('permission:manage_vehicles');
        Route::put('/vehicles/{id}/status', [VehicleController::class, 'updateStatus'])->middleware('permission:manage_vehicles');

        // Driver and passenger status updates remain admin-only (no permissions configured)
        Route::get('/drivers', [DriverController::class, 'index']);
        Route::get('/drivers/{id}', [DriverController::class, 'show']);
        Route::get('/passengers', [PassengerController::class, 'index']);
        Route::get('/passengers/{id}', [PassengerController::class, 'show']);
        Route::put('/drivers/{id}/status', [DriverController::class, 'updateStatus']);
        Route::put('/drivers/{id}/active-status', [DriverController::class, 'updateActiveStatus']);
        Route::put('/passengers/{id}/status', [PassengerController::class, 'updateStatus']);

        Route::get('/dashboard/stats', [DashboardController::class, 'getStats']);
        Route::post('/user/update-password', [AuthController::class, 'updatePassword']);
        Route::apiResource('promotions', PromotionController::class)->except(['index', 'show']);

        // App Settings routes (Super Admin only)
        Route::middleware('super_admin')->group(function () {
            Route::get('/app-settings', [AppSettingsController::class, 'index']);
            Route::get('/app-settings/{key}', [AppSettingsController::class, 'show']);
            Route::put('/app-settings/{key}', [AppSettingsController::class, 'update']);
        });

        // Super Admin only routes
        Route::middleware('super_admin')->group(function () {
            Route::apiResource('admins', AdminController::class);
            Route::put('/admins/{id}/status', [AdminController::class, 'updateStatus']);

            // Super admin notifications
            Route::get('/superadmin/notifications', [SuperAdminNotificationController::class, 'index']);
            Route::put('/superadmin/notifications/read', [SuperAdminNotificationController::class, 'markAllRead']);
            Route::delete('/superadmin/notifications', [SuperAdminNotificationController::class, 'clear']);
            Route::delete('/superadmin/notifications/read', [SuperAdminNotificationController::class, 'clearRead']);
        });
    });
});
