<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use App\Services\Notifications\NotificationService;
use App\Jobs\SendExpoPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class NotificationServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_notify_does_not_save_to_database_by_default(): void
    {
        Queue::fake();

        $user = User::create([
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com',
            'phone' => '0777123456',
            'password' => 'password',
            'role' => User::ROLE_PASSENGER,
            'is_active' => true,
        ]);

        $service = new NotificationService();
        $result = $service->notify($user, 'Test Title', 'Test Body', ['custom' => 'data']);

        $this->assertNull($result);

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $user->id,
            'title' => 'Test Title',
        ]);

        Queue::assertPushed(SendExpoPushNotification::class, function ($job) use ($user) {
            return $job->userId === $user->id &&
                   $job->title === 'Test Title' &&
                   $job->body === 'Test Body' &&
                   $job->data === ['custom' => 'data'];
        });
    }

    public function test_notify_saves_to_database_when_explicitly_requested(): void
    {
        Queue::fake();

        $user = User::create([
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com',
            'phone' => '0777123456',
            'password' => 'password',
            'role' => User::ROLE_PASSENGER,
            'is_active' => true,
        ]);

        $service = new NotificationService();
        $result = $service->notify($user, 'Test Title', 'Test Body', ['custom' => 'data'], true);

        $this->assertNotNull($result);
        $this->assertInstanceOf(Notification::class, $result);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'title' => 'Test Title',
            'message' => 'Test Body',
        ]);

        Queue::assertPushed(SendExpoPushNotification::class, function ($job) use ($user) {
            return $job->userId === $user->id &&
                   $job->title === 'Test Title' &&
                   $job->body === 'Test Body';
        });
    }

    public function test_user_retrieves_both_personal_and_targeted_global_notifications(): void
    {
        $user = User::create([
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com',
            'phone' => '0777123456',
            'password' => 'password',
            'role' => User::ROLE_PASSENGER,
            'is_active' => true,
        ]);
        $user->ensureRole(User::ROLE_PASSENGER);

        \Laravel\Sanctum\Sanctum::actingAs($user, ['role:passenger']);

        // 1. Personal notification
        Notification::create([
            'user_id' => $user->id,
            'title' => 'Personal Offer',
            'message' => 'Just for you!',
        ]);

        // 2. Global notification matching passenger
        Notification::create([
            'user_id' => null,
            'target' => 'passenger',
            'title' => 'Passenger Update',
            'message' => 'Hello Passengers!',
        ]);

        // 3. Global notification matching all
        Notification::create([
            'user_id' => null,
            'target' => 'all',
            'title' => 'System Update',
            'message' => 'System maintenance.',
        ]);

        // 4. Global notification targeting drivers (should NOT return)
        Notification::create([
            'user_id' => null,
            'target' => 'driver',
            'title' => 'Driver Promo',
            'message' => 'Earn more today!',
        ]);

        $response = $this->getJson('/api/notifications')
            ->assertOk();

        $data = $response->json('data.data');

        $this->assertCount(3, $data);
        $titles = collect($data)->pluck('title');
        $this->assertTrue($titles->contains('Personal Offer'));
        $this->assertTrue($titles->contains('Passenger Update'));
        $this->assertTrue($titles->contains('System Update'));
        $this->assertFalse($titles->contains('Driver Promo'));
    }

    public function test_global_notifications_cannot_be_deleted_by_regular_users(): void
    {
        $user = User::create([
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com',
            'phone' => '0777123456',
            'password' => 'password',
            'role' => User::ROLE_PASSENGER,
            'is_active' => true,
        ]);
        $user->ensureRole(User::ROLE_PASSENGER);

        \Laravel\Sanctum\Sanctum::actingAs($user, ['role:passenger']);

        $globalNotification = Notification::create([
            'user_id' => null,
            'target' => 'all',
            'title' => 'Global Message',
            'message' => 'Important!',
            'is_read' => false,
        ]);

        // Try to update is_read status (should return success but NOT change in DB since it is global)
        $this->putJson("/api/notifications/{$globalNotification->id}", ['is_read' => true])
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'id' => $globalNotification->id,
            'is_read' => false, // should still be false in database
        ]);

        // Try to delete (should return forbidden 403)
        $this->deleteJson("/api/notifications/{$globalNotification->id}")
            ->assertStatus(403);

        $this->assertDatabaseHas('notifications', [
            'id' => $globalNotification->id,
        ]);
    }
}
