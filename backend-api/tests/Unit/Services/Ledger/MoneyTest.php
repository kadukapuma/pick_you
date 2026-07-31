<?php

namespace Tests\Unit\Services\Ledger;

use App\Services\Ledger\Money;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    public function test_rounds_half_up_away_from_zero(): void
    {
        $this->assertSame('0.01', Money::round('0.005'));
        $this->assertSame('0.02', Money::round('0.015'));
        $this->assertSame('-0.01', Money::round('-0.005'));
        $this->assertSame('1.00', Money::round('0.999'));
    }

    public function test_multiplication_does_not_truncate(): void
    {
        // bcmath truncates by default; 19.9998 must become 20.00, not 19.99.
        $this->assertSame('20.00', Money::mul('333.33', '0.06'));
    }

    public function test_commission_and_driver_share_always_sum_to_gross(): void
    {
        // Awkward fares where naive independent rounding would lose or gain a cent.
        foreach (['333.33', '0.01', '99.99', '1234.56', '7.77', '0.17'] as $gross) {
            $commission = Money::mul($gross, '0.06');
            $driver = Money::sub($gross, $commission);

            $this->assertSame(
                Money::of($gross),
                Money::add($commission, $driver),
                "commission + driver_earning != gross for {$gross}",
            );
        }
    }

    public function test_avoids_binary_float_error(): void
    {
        // 0.1 + 0.2 === 0.3 is false for floats but must hold here.
        $this->assertSame('0.30', Money::add('0.10', '0.20'));
    }

    public function test_rejects_non_numeric_input(): void
    {
        $this->expectException(InvalidArgumentException::class);

        Money::of('1,000.00');
    }

    public function test_sign_helpers(): void
    {
        $this->assertTrue(Money::isNegative('-0.01'));
        $this->assertFalse(Money::isNegative('0.00'));
        $this->assertTrue(Money::isZero('0.00'));
        $this->assertSame('-5.00', Money::negate('5.00'));
    }
}
