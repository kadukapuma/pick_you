<?php

namespace Tests\Unit\Policies;

use App\Models\Driver;
use App\Models\Passenger;
use App\Models\Ride;
use App\Models\User;
use App\Policies\RidePolicy;
use PHPUnit\Framework\TestCase;

class RidePolicyTest extends TestCase
{
    private RidePolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();

        $this->policy = new RidePolicy;
    }

    public function test_passenger_can_view_cancel_and_pay_for_own_ride(): void
    {
        $user = $this->passengerUser(10);
        $ride = $this->ride(passengerId: 10, driverId: 20);

        $this->assertTrue($this->policy->view($user, $ride));
        $this->assertTrue($this->policy->cancel($user, $ride));
        $this->assertTrue($this->policy->processPayment($user, $ride));
    }

    public function test_passenger_cannot_access_another_passengers_ride(): void
    {
        $user = $this->passengerUser(11);
        $ride = $this->ride(passengerId: 10, driverId: 20);

        $this->assertFalse($this->policy->view($user, $ride));
        $this->assertFalse($this->policy->cancel($user, $ride));
        $this->assertFalse($this->policy->processPayment($user, $ride));
    }

    public function test_assigned_driver_can_view_confirm_payment_and_cancel(): void
    {
        $user = $this->driverUser(20);
        $ride = $this->ride(passengerId: 10, driverId: 20);

        $this->assertTrue($this->policy->view($user, $ride));
        $this->assertTrue($this->policy->cancel($user, $ride));
        $this->assertTrue($this->policy->processPayment($user, $ride));
    }

    public function test_unassigned_driver_cannot_access_ride(): void
    {
        $user = $this->driverUser(21);
        $ride = $this->ride(passengerId: 10, driverId: 20);

        $this->assertFalse($this->policy->view($user, $ride));
        $this->assertFalse($this->policy->cancel($user, $ride));
        $this->assertFalse($this->policy->processPayment($user, $ride));
    }

    public function test_operator_can_view_but_cannot_cancel_or_pay(): void
    {
        $user = new User(['role' => User::ROLE_OPERATOR]);
        $ride = $this->ride(passengerId: 10, driverId: 20);

        $this->assertTrue($this->policy->view($user, $ride));
        $this->assertFalse($this->policy->cancel($user, $ride));
        $this->assertFalse($this->policy->processPayment($user, $ride));
    }

    public function test_administrators_can_view_cancel_and_process_payment(): void
    {
        $ride = $this->ride(passengerId: 10, driverId: 20);

        foreach ([User::ROLE_ADMIN, User::ROLE_SUPER_ADMIN] as $role) {
            $user = new User(['role' => $role]);

            $this->assertTrue($this->policy->view($user, $ride));
            $this->assertTrue($this->policy->cancel($user, $ride));
            $this->assertTrue($this->policy->processPayment($user, $ride));
        }
    }

    private function passengerUser(int $passengerId): User
    {
        $user = new User(['role' => User::ROLE_PASSENGER]);
        $passenger = new Passenger;
        $passenger->id = $passengerId;

        return $user->setRelation('passenger', $passenger);
    }

    private function driverUser(int $driverId): User
    {
        $user = new User(['role' => User::ROLE_DRIVER]);
        $driver = new Driver;
        $driver->id = $driverId;

        return $user->setRelation('driver', $driver);
    }

    private function ride(int $passengerId, ?int $driverId): Ride
    {
        $ride = new Ride;
        $ride->passenger_id = $passengerId;
        $ride->driver_id = $driverId;

        return $ride;
    }
}
