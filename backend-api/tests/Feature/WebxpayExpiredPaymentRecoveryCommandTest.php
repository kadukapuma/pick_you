<?php

namespace Tests\Feature;

use App\Services\Payments\WebxpayExpiredPaymentRecovery;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schedule;
use Mockery;
use Tests\TestCase;

class WebxpayExpiredPaymentRecoveryCommandTest extends TestCase
{
    public function test_command_recovers_a_bounded_batch(): void
    {
        $recovery = Mockery::mock(WebxpayExpiredPaymentRecovery::class);
        $recovery->expects('recoverExpired')
            ->once()
            ->with(25)
            ->andReturn(3);
        $this->app->instance(WebxpayExpiredPaymentRecovery::class, $recovery);

        $this->artisan('payments:webxpay:recover-expired', ['--limit' => 25])
            ->expectsOutput('Recovered 3 expired WEBXPAY payment attempt(s).')
            ->assertSuccessful();
    }

    public function test_command_rejects_an_invalid_limit(): void
    {
        $recovery = Mockery::mock(WebxpayExpiredPaymentRecovery::class);
        $recovery->expects('recoverExpired')->never();
        $this->app->instance(WebxpayExpiredPaymentRecovery::class, $recovery);

        $this->artisan('payments:webxpay:recover-expired', ['--limit' => 0])
            ->expectsOutput('The --limit option must be an integer from 1 to 1000.')
            ->assertExitCode(Command::INVALID);
    }

    public function test_recovery_command_is_scheduled_without_overlap(): void
    {
        $event = collect(Schedule::events())->first(
            fn ($event) => str_contains(
                $event->command,
                'payments:webxpay:recover-expired --limit=100'
            )
        );

        $this->assertNotNull($event);
        $this->assertSame('* * * * *', $event->expression);
        $this->assertTrue($event->withoutOverlapping);
    }
}
