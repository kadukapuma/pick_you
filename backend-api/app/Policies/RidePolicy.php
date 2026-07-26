<?php

namespace App\Policies;

use App\Models\Ride;
use App\Models\User;

class RidePolicy
{
    public function view(User $user, Ride $ride): bool
    {
        return $this->isPrivilegedUser($user)
            || $this->isOwningPassenger($user, $ride)
            || $this->isAssignedDriver($user, $ride);
    }

    public function cancel(User $user, Ride $ride): bool
    {
        return $this->isAdministrator($user)
            || $this->isOwningPassenger($user, $ride)
            || $this->isAssignedDriver($user, $ride);
    }

    public function processPayment(User $user, Ride $ride): bool
    {
        return $this->isAdministrator($user)
            || $this->isOwningPassenger($user, $ride)
            || $this->isAssignedDriver($user, $ride);
    }

    private function isOwningPassenger(User $user, Ride $ride): bool
    {
        return $user->canActAs(User::ROLE_PASSENGER)
            && $user->passenger !== null
            && (int) $user->passenger->id === (int) $ride->passenger_id;
    }

    private function isAssignedDriver(User $user, Ride $ride): bool
    {
        return $user->canActAs(User::ROLE_DRIVER)
            && $user->driver !== null
            && $ride->driver_id !== null
            && (int) $user->driver->id === (int) $ride->driver_id;
    }

    private function isAdministrator(User $user): bool
    {
        return $user->canActAs(User::ROLE_ADMIN)
            || $user->canActAs(User::ROLE_SUPER_ADMIN);
    }

    private function isPrivilegedUser(User $user): bool
    {
        return $this->isAdministrator($user)
            || $user->canActAs(User::ROLE_OPERATOR);
    }
}
