<?php

namespace Tests\Feature;

use App\Models\DeviceToken;
use App\Models\Driver;
use App\Models\Notification;
use App\Models\Passenger;
use App\Models\User;
use App\Jobs\SendBulkCampaignJob;
use App\Jobs\SendExpoPushTokensChunkJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BulkNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_dispatch_bulk_notification(): void
    {
        $user = User::create([
            'first_name' => 'Regular',
            'last_name' => 'User',
            'email' => 'regular@example.com',
            'phone' => '0771234567',
            'password' => 'password',
            'role' => User::ROLE_PASSENGER,
            'is_active' => true,
        ]);

        Sanctum::actingAs($user, ['role:passenger']);

        $this->postJson('/api/admin/notifications/send-bulk', [
            'target' => 'driver',
            'title' => 'Test Notification',
            'body' => 'Hello Drivers!',
        ])
            ->assertStatus(403); // Forbidden
    }

    public function test_admin_can_dispatch_bulk_notification(): void
    {
        Queue::fake();

        $admin = User::create([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'email' => 'admin@example.com',
            'phone' => '0771234568',
            'password' => 'password',
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
        ]);

        // Mock permission check (if CheckPermission checks database permissions)
        $admin->rolePermissions()->create([
            'permission' => 'manage_notifications'
        ]);

        Sanctum::actingAs($admin, ['role:admin']);

        $this->postJson('/api/admin/notifications/send-bulk', [
            'target' => 'driver',
            'title' => 'Campaign Title',
            'body' => 'Campaign Message Body',
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Bulk notification campaign scheduled successfully.');

        Queue::assertPushed(SendBulkCampaignJob::class, function ($job) {
            return $job->target === 'driver' &&
                   $job->title === 'Campaign Title' &&
                   $job->body === 'Campaign Message Body';
        });
    }

    public function test_validation_rules_for_bulk_notification(): void
    {
        $admin = User::create([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'email' => 'admin@example.com',
            'phone' => '0771234568',
            'password' => 'password',
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
        ]);
        $admin->rolePermissions()->create(['permission' => 'manage_notifications']);

        Sanctum::actingAs($admin, ['role:admin']);

        // Missing fields
        $this->postJson('/api/admin/notifications/send-bulk', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['target', 'title', 'body']);

        // Invalid target
        $this->postJson('/api/admin/notifications/send-bulk', [
            'target' => 'invalid_role',
            'title' => 'Test',
            'body' => 'Body',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['target']);
    }

    public function test_send_bulk_campaign_job_execution_targeting_drivers(): void
    {
        Queue::fake();

        // 1. Create a driver user
        $driverUser = User::create([
            'first_name' => 'Driver',
            'last_name' => 'One',
            'email' => 'driver@example.com',
            'phone' => '0771111111',
            'password' => 'password',
            'role' => User::ROLE_DRIVER,
            'is_active' => true,
        ]);
        Driver::create([
            'user_id' => $driverUser->id,
            'status' => 'approved',
            'availability' => 0,
        ]);
        $driverToken = DeviceToken::create([
            'user_id' => $driverUser->id,
            'token' => 'ExponentPushToken[driver_token_123]',
            'app' => 'driver',
        ]);

        // 2. Create a passenger user
        $passengerUser = User::create([
            'first_name' => 'Passenger',
            'last_name' => 'One',
            'email' => 'passenger@example.com',
            'phone' => '0772222222',
            'password' => 'password',
            'role' => User::ROLE_PASSENGER,
            'is_active' => true,
        ]);
        Passenger::create([
            'user_id' => $passengerUser->id,
            'wallet_balance' => 0,
        ]);
        $passengerToken = DeviceToken::create([
            'user_id' => $passengerUser->id,
            'token' => 'ExponentPushToken[passenger_token_456]',
            'app' => 'passenger',
        ]);

        // 3. Dispatch and execute the job targeting 'driver'
        $job = new SendBulkCampaignJob('driver', 'Driver Alert', 'Important news for drivers!');
        $job->handle();

        // 4. Verify DB Notifications
        // Single global notification should be stored targeting drivers
        $this->assertDatabaseHas('notifications', [
            'user_id' => null,
            'target' => 'driver',
            'title' => 'Driver Alert',
            'message' => 'Important news for drivers!',
        ]);

        // Ensure no per-user notifications were created
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $driverUser->id,
        ]);
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $passengerUser->id,
        ]);

        // 5. Verify push notification chunk jobs
        Queue::assertPushed(SendExpoPushTokensChunkJob::class, function ($job) use ($driverToken) {
            return in_array($driverToken->id, $job->deviceTokenIds, true) &&
                   $job->title === 'Driver Alert' &&
                   $job->body === 'Important news for drivers!';
        });

        Queue::assertNotPushed(SendExpoPushTokensChunkJob::class, function ($job) use ($passengerToken) {
            return in_array($passengerToken->id, $job->deviceTokenIds, true);
        });
    }

    public function test_send_bulk_campaign_job_execution_targeting_all(): void
    {
        Queue::fake();

        // 1. Create a driver
        $driverUser = User::create([
            'first_name' => 'Driver',
            'last_name' => 'One',
            'email' => 'driver@example.com',
            'phone' => '0771111111',
            'password' => 'password',
            'role' => User::ROLE_DRIVER,
            'is_active' => true,
        ]);
        Driver::create([
            'user_id' => $driverUser->id,
            'status' => 'approved',
            'availability' => 0,
        ]);
        $driverToken = DeviceToken::create([
            'user_id' => $driverUser->id,
            'token' => 'ExponentPushToken[driver_token_123]',
            'app' => 'driver',
        ]);

        // 2. Create a passenger
        $passengerUser = User::create([
            'first_name' => 'Passenger',
            'last_name' => 'One',
            'email' => 'passenger@example.com',
            'phone' => '0772222222',
            'password' => 'password',
            'role' => User::ROLE_PASSENGER,
            'is_active' => true,
        ]);
        Passenger::create([
            'user_id' => $passengerUser->id,
            'wallet_balance' => 0,
        ]);
        $passengerToken = DeviceToken::create([
            'user_id' => $passengerUser->id,
            'token' => 'ExponentPushToken[passenger_token_456]',
            'app' => 'passenger',
        ]);

        // 3. Dispatch and execute job targeting 'all'
        $job = new SendBulkCampaignJob('all', 'System Update', 'Scheduled maintenance tonight.');
        $job->handle();

        // 4. Verify DB Notifications
        $this->assertDatabaseHas('notifications', [
            'user_id' => null,
            'target' => 'all',
            'title' => 'System Update',
            'message' => 'Scheduled maintenance tonight.',
        ]);

        // Ensure no per-user notifications were created
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $driverUser->id,
        ]);
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $passengerUser->id,
        ]);

        // 5. Verify push notification chunk jobs
        Queue::assertPushed(SendExpoPushTokensChunkJob::class, function ($job) use ($driverToken) {
            return in_array($driverToken->id, $job->deviceTokenIds, true);
        });
        Queue::assertPushed(SendExpoPushTokensChunkJob::class, function ($job) use ($passengerToken) {
            return in_array($passengerToken->id, $job->deviceTokenIds, true);
        });
    }

    public function test_send_bulk_campaign_does_not_mix_app_tokens_for_multi_role_users(): void
    {
        Queue::fake();

        // User with both roles/apps active
        $user = User::create([
            'first_name' => 'Dual',
            'last_name' => 'User',
            'email' => 'dual@example.com',
            'phone' => '0773333333',
            'password' => 'password',
            'role' => User::ROLE_DRIVER,
            'is_active' => true,
        ]);
        $user->ensureRole(User::ROLE_DRIVER);
        $user->ensureRole(User::ROLE_PASSENGER);

        Driver::create(['user_id' => $user->id, 'status' => 'approved', 'availability' => 0]);
        Passenger::create(['user_id' => $user->id, 'wallet_balance' => 0]);

        $driverToken = DeviceToken::create([
            'user_id' => $user->id,
            'token' => 'ExponentPushToken[driver_app_token]',
            'app' => 'driver',
        ]);

        $passengerToken = DeviceToken::create([
            'user_id' => $user->id,
            'token' => 'ExponentPushToken[passenger_app_token]',
            'app' => 'passenger',
        ]);

        // Target drivers only
        $job = new SendBulkCampaignJob('driver', 'Driver News', 'Text body');
        $job->handle();

        // Verification: Only the driver token should be targeted
        Queue::assertPushed(SendExpoPushTokensChunkJob::class, function ($job) use ($driverToken) {
            return in_array($driverToken->id, $job->deviceTokenIds, true);
        });

        Queue::assertNotPushed(SendExpoPushTokensChunkJob::class, function ($job) use ($passengerToken) {
            return in_array($passengerToken->id, $job->deviceTokenIds, true);
        });
    }

    public function test_admin_can_fetch_broadcast_notifications(): void
    {
        $admin = User::create([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'email' => 'admin_broadcasts@example.com',
            'phone' => '0771234569',
            'password' => 'password',
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
        ]);
        $admin->rolePermissions()->create(['permission' => 'manage_notifications']);

        // Create broadcast notifications (user_id is null)
        Notification::create([
            'user_id' => null,
            'target' => 'driver',
            'title' => 'Driver Broadcast 1',
            'message' => 'Message to drivers',
            'is_read' => true,
        ]);

        Notification::create([
            'user_id' => null,
            'target' => 'passenger',
            'title' => 'Passenger Broadcast 1',
            'message' => 'Message to passengers',
            'is_read' => true,
        ]);

        // Create individual notification (should NOT appear in broadcast list)
        Notification::create([
            'user_id' => $admin->id,
            'target' => null,
            'title' => 'Personal alert',
            'message' => 'Personal message',
            'is_read' => false,
        ]);

        Sanctum::actingAs($admin, ['role:admin']);

        $response = $this->getJson('/api/admin/notifications/broadcasts')
            ->assertOk()
            ->assertJsonPath('status', 'success');

        $this->assertCount(2, $response->json('data.broadcasts'));
        $this->assertEquals(2, $response->json('data.pagination.total'));
    }

    public function test_admin_can_filter_and_search_broadcast_notifications(): void
    {
        $admin = User::create([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'email' => 'admin_search@example.com',
            'phone' => '0771234570',
            'password' => 'password',
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
        ]);
        $admin->rolePermissions()->create(['permission' => 'manage_notifications']);

        Notification::create([
            'user_id' => null,
            'target' => 'driver',
            'title' => 'Fuel Discount Alert',
            'message' => 'Save on petrol this weekend',
            'is_read' => true,
        ]);

        Notification::create([
            'user_id' => null,
            'target' => 'passenger',
            'title' => 'Holiday Promo 50% Off',
            'message' => 'Get half off on your next trip',
            'is_read' => true,
        ]);

        Sanctum::actingAs($admin, ['role:admin']);

        // Filter by target=driver
        $responseDriver = $this->getJson('/api/admin/notifications/broadcasts?target=driver')
            ->assertOk();
        $this->assertCount(1, $responseDriver->json('data.broadcasts'));
        $this->assertEquals('Fuel Discount Alert', $responseDriver->json('data.broadcasts.0.title'));

        // Search by query
        $responseSearch = $this->getJson('/api/admin/notifications/broadcasts?search=Promo')
            ->assertOk();
        $this->assertCount(1, $responseSearch->json('data.broadcasts'));
        $this->assertEquals('Holiday Promo 50% Off', $responseSearch->json('data.broadcasts.0.title'));
    }

    public function test_admin_can_delete_broadcast_notification(): void
    {
        $admin = User::create([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'email' => 'admin_delete@example.com',
            'phone' => '0771234571',
            'password' => 'password',
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
        ]);
        $admin->rolePermissions()->create(['permission' => 'manage_notifications']);

        $broadcast = Notification::create([
            'user_id' => null,
            'target' => 'driver',
            'title' => 'Temporary Traffic Alert',
            'message' => 'Heavy traffic on main road',
            'is_read' => true,
        ]);

        Sanctum::actingAs($admin, ['role:admin']);

        $this->deleteJson("/api/admin/notifications/broadcasts/{$broadcast->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Broadcast notification deleted successfully.');

        $this->assertDatabaseMissing('notifications', ['id' => $broadcast->id]);

        // Deleting non-existent should 404
        $this->deleteJson('/api/admin/notifications/broadcasts/999999')
            ->assertStatus(404);
    }

    public function test_admin_can_clear_all_broadcast_notifications(): void
    {
        $admin = User::create([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'email' => 'admin_clear@example.com',
            'phone' => '0771234572',
            'password' => 'password',
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
        ]);
        $admin->rolePermissions()->create(['permission' => 'manage_notifications']);

        Notification::create([
            'user_id' => null,
            'target' => 'driver',
            'title' => 'Broadcast 1',
            'message' => 'Msg 1',
            'is_read' => true,
        ]);

        Notification::create([
            'user_id' => null,
            'target' => 'passenger',
            'title' => 'Broadcast 2',
            'message' => 'Msg 2',
            'is_read' => true,
        ]);

        Sanctum::actingAs($admin, ['role:admin']);

        $this->deleteJson('/api/admin/notifications/broadcasts')
            ->assertOk()
            ->assertJsonPath('data.deleted', 2);

        $this->assertEquals(0, Notification::whereNull('user_id')->count());
    }

    public function test_non_admin_cannot_access_or_delete_broadcast_notifications(): void
    {
        $passenger = User::create([
            'first_name' => 'Passenger',
            'last_name' => 'User',
            'email' => 'passenger_unauth@example.com',
            'phone' => '0771234573',
            'password' => 'password',
            'role' => User::ROLE_PASSENGER,
            'is_active' => true,
        ]);

        $broadcast = Notification::create([
            'user_id' => null,
            'target' => 'all',
            'title' => 'System Broadcast',
            'message' => 'Msg',
            'is_read' => true,
        ]);

        Sanctum::actingAs($passenger, ['role:passenger']);

        $this->getJson('/api/admin/notifications/broadcasts')
            ->assertStatus(403);

        $this->deleteJson("/api/admin/notifications/broadcasts/{$broadcast->id}")
            ->assertStatus(403);
    }
}
