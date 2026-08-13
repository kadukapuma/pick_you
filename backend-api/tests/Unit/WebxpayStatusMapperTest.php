<?php

namespace Tests\Unit;

use App\Enums\PaymentAttemptStatus;
use App\Services\Payments\WebxpayStatusMapper;
use PHPUnit\Framework\TestCase;

class WebxpayStatusMapperTest extends TestCase
{
    public function test_zero_status_is_completed(): void
    {
        $mapper = new WebxpayStatusMapper;

        $this->assertSame(
            PaymentAttemptStatus::COMPLETED,
            $mapper->map('0')
        );
    }

    public function test_double_zero_status_is_completed(): void
    {
        $mapper = new WebxpayStatusMapper;

        $this->assertSame(
            PaymentAttemptStatus::COMPLETED,
            $mapper->map('00')
        );
    }

    public function test_status_fifteen_is_declined(): void
    {
        $mapper = new WebxpayStatusMapper;

        $this->assertSame(
            PaymentAttemptStatus::DECLINED,
            $mapper->map('15')
        );
    }

    public function test_unconfirmed_status_is_unknown(): void
    {
        $mapper = new WebxpayStatusMapper;

        $this->assertSame(
            PaymentAttemptStatus::UNKNOWN,
            $mapper->map('416')
        );

        $this->assertSame(
            PaymentAttemptStatus::UNKNOWN,
            $mapper->map('999')
        );
    }
}
