<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/otp/send', [AuthController::class, 'sendOtp']);
Route::post('/otp/verify', [AuthController::class, 'verifyOtp']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/login/verify-2fa', [AuthController::class, 'verifySuperAdmin2FA']);

// Public app settings (maintenance mode check for all users)
Route::get('/app-settings/maintenance-mode', [App\Http\Controllers\Api\AppSettingsController::class, 'getMaintenanceMode']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user()->load(['driver.vehicles', 'rolePermissions']);
    });
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/user/profile-picture', [AuthController::class, 'updateProfilePicture']);
    Route::get('/driver/profile', [App\Http\Controllers\Api\DriverProfileController::class, 'getProfile']);
    Route::post('/driver/complete-profile', [App\Http\Controllers\Api\DriverController::class, 'completeProfile']);
    Route::post('/driver/license-images', [App\Http\Controllers\Api\DriverController::class, 'updateLicenseImages']);
    Route::put('/driver/availability', [App\Http\Controllers\Api\DriverController::class, 'updateOwnAvailability']);

    // Resource routes
    Route::apiResource('passengers', App\Http\Controllers\Api\PassengerController::class);
    Route::apiResource('drivers', App\Http\Controllers\Api\DriverController::class);
    Route::apiResource('vehicles', App\Http\Controllers\Api\VehicleController::class);
    Route::post('/vehicles/{id}/upload-images', [App\Http\Controllers\Api\VehicleController::class, 'uploadImages']);
    Route::get('/vehicle-types', [App\Http\Controllers\Api\VehicleTypeController::class, 'index']);
    Route::apiResource('driver-documents', App\Http\Controllers\Api\DriverDocumentController::class);
    Route::apiResource('rides', App\Http\Controllers\Api\RideController::class);
    Route::post('/rides/{id}/accept', [App\Http\Controllers\Api\RideController::class, 'acceptRide']);
    Route::apiResource('ride-statuses', App\Http\Controllers\Api\RideStatusController::class);
    Route::post('/payments/{ride_id}', [App\Http\Controllers\Api\PaymentController::class, 'processPayment']);
    Route::apiResource('wallet-transactions', App\Http\Controllers\Api\WalletTransactionController::class);
    Route::apiResource('ratings', App\Http\Controllers\Api\RatingController::class);
    Route::apiResource('promotions', App\Http\Controllers\Api\PromotionController::class);
    Route::apiResource('ride-promotions', App\Http\Controllers\Api\RidePromotionController::class);
    Route::apiResource('driver-locations', App\Http\Controllers\Api\DriverLocationController::class);
    Route::apiResource('otp-verifications', App\Http\Controllers\Api\OtpVerificationController::class);
    Route::apiResource('notifications', App\Http\Controllers\Api\NotificationController::class);
    Route::apiResource('support-tickets', App\Http\Controllers\Api\SupportTicketController::class);

    // Admin routes
    Route::middleware('admin')->group(function () {
        // Admin notification routes require manage_notifications permission
        Route::middleware('permission:manage_notifications')->group(function () {
            Route::get('/admin/notifications', [App\Http\Controllers\Api\AdminNotificationController::class, 'index']);
            Route::put('/admin/notifications/read', [App\Http\Controllers\Api\AdminNotificationController::class, 'markAllRead']);
            Route::delete('/admin/notifications', [App\Http\Controllers\Api\AdminNotificationController::class, 'clear']);
            Route::delete('/admin/notifications/read', [App\Http\Controllers\Api\AdminNotificationController::class, 'clearRead']);
        });

        Route::get('/role-permissions', [App\Http\Controllers\Api\RolePermissionController::class, 'index'])->middleware('super_admin');
        Route::put('/role-permissions/{role}', [App\Http\Controllers\Api\RolePermissionController::class, 'update'])->middleware('super_admin');
        Route::get('/operators', [App\Http\Controllers\Api\OperatorController::class, 'index'])->middleware('permission:create_operators,manage_operators');
        Route::post('/operators', [App\Http\Controllers\Api\OperatorController::class, 'store'])->middleware('permission:create_operators');
        Route::put('/operators/{id}', [App\Http\Controllers\Api\OperatorController::class, 'update'])->middleware('permission:manage_operators');
        Route::put('/operators/{id}/status', [App\Http\Controllers\Api\OperatorController::class, 'updateStatus'])->middleware('permission:manage_operators');
        Route::delete('/operators/{id}', [App\Http\Controllers\Api\OperatorController::class, 'destroy'])->middleware('permission:manage_operators');
        Route::apiResource('fare-configs', App\Http\Controllers\Api\FareConfigController::class)->middleware('permission:manage_fare_configs');
        Route::apiResource('vehicle-types', App\Http\Controllers\Api\VehicleTypeController::class)->except(['index'])->middleware('permission:manage_vehicle_types');

        // Vehicle management requires manage_vehicles permission
        Route::apiResource('vehicles', App\Http\Controllers\Api\VehicleController::class)->middleware('permission:manage_vehicles');
        Route::post('/vehicles/{id}/upload-images', [App\Http\Controllers\Api\VehicleController::class, 'uploadImages'])->middleware('permission:manage_vehicles');
        Route::put('/vehicles/{id}/status', [App\Http\Controllers\Api\VehicleController::class, 'updateStatus'])->middleware('permission:manage_vehicles');

        // Driver and passenger status updates remain admin-only (no permissions configured)
        Route::put('/drivers/{id}/status', [App\Http\Controllers\Api\DriverController::class, 'updateStatus']);
        Route::put('/drivers/{id}/active-status', [App\Http\Controllers\Api\DriverController::class, 'updateActiveStatus']);
        Route::put('/passengers/{id}/status', [App\Http\Controllers\Api\PassengerController::class, 'updateStatus']);

        Route::get('/dashboard/stats', [App\Http\Controllers\Api\DashboardController::class, 'getStats']);
        Route::post('/user/update-password', [AuthController::class, 'updatePassword']);

        // App Settings routes (Super Admin only)
        Route::middleware('super_admin')->group(function () {
            Route::get('/app-settings', [App\Http\Controllers\Api\AppSettingsController::class, 'index']);
            Route::get('/app-settings/{key}', [App\Http\Controllers\Api\AppSettingsController::class, 'show']);
            Route::put('/app-settings/{key}', [App\Http\Controllers\Api\AppSettingsController::class, 'update']);
        });

        // Super Admin only routes
        Route::middleware('super_admin')->group(function () {
            Route::apiResource('admins', App\Http\Controllers\Api\AdminController::class);
            Route::put('/admins/{id}/status', [App\Http\Controllers\Api\AdminController::class, 'updateStatus']);

            // Super admin notifications
            Route::get('/superadmin/notifications', [App\Http\Controllers\Api\SuperAdminNotificationController::class, 'index']);
            Route::put('/superadmin/notifications/read', [App\Http\Controllers\Api\SuperAdminNotificationController::class, 'markAllRead']);
            Route::delete('/superadmin/notifications', [App\Http\Controllers\Api\SuperAdminNotificationController::class, 'clear']);
            Route::delete('/superadmin/notifications/read', [App\Http\Controllers\Api\SuperAdminNotificationController::class, 'clearRead']);
        });
    });
});
