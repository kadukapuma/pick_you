<?php

use App\Models\Ride;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('driver.rides.{driverId}', function ($user, $driverId) {
    return $user->role === User::ROLE_DRIVER
        && $user->driver !== null
        && (int) $user->driver->id === (int) $driverId;
});

Broadcast::channel('ride.{rideId}', function ($user, $rideId) {
    $ride = Ride::query()->find($rideId);

    return $ride !== null
        && in_array($ride->status, ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'STARTED', 'COMPLETED'], true)
        && $user->can('view', $ride);
});
