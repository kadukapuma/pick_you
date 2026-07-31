<?php

namespace App\Services\Ledger;

use InvalidArgumentException;

/**
 * Decimal money arithmetic on strings via bcmath.
 *
 * Floats are never used: 0.1 + 0.2 !== 0.3 is not an acceptable property for a
 * ledger that has to balance to the cent.
 */
final class Money
{
    public const SCALE = 2;

    /** Scale used mid-calculation before rounding back to SCALE. */
    private const WORKING_SCALE = 8;

    public static function of(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '0.00';
        }

        if (is_float($value)) {
            // Only safe entry point for a float: format it before bcmath sees it,
            // since bcmath would otherwise read the locale-dependent cast.
            $value = number_format($value, self::WORKING_SCALE, '.', '');
        }

        $value = (string) $value;

        if (! preg_match('/^-?\d+(\.\d+)?$/', $value)) {
            throw new InvalidArgumentException("Not a valid monetary amount: {$value}");
        }

        return self::round($value);
    }

    public static function add(string $a, string $b): string
    {
        return bcadd($a, $b, self::SCALE);
    }

    public static function sub(string $a, string $b): string
    {
        return bcsub($a, $b, self::SCALE);
    }

    /** Multiply at working scale, then round half-up to 2dp. */
    public static function mul(string $a, string $b): string
    {
        return self::round(bcmul($a, $b, self::WORKING_SCALE));
    }

    public static function cmp(string $a, string $b): int
    {
        return bccomp($a, $b, self::SCALE);
    }

    public static function isZero(string $a): bool
    {
        return bccomp($a, '0', self::SCALE) === 0;
    }

    public static function isNegative(string $a): bool
    {
        return bccomp($a, '0', self::SCALE) < 0;
    }

    public static function negate(string $a): string
    {
        return bcsub('0', $a, self::SCALE);
    }

    /**
     * Round half-up (away from zero) to 2dp. bcmath truncates, so shift by half a
     * cent first. Half-up matters: it is what invoices are expected to do, and it
     * keeps commission from being systematically under-charged.
     */
    public static function round(string $value, int $scale = self::SCALE): string
    {
        $half = '0.'.str_repeat('0', $scale).'5';

        return bccomp($value, '0', self::WORKING_SCALE) >= 0
            ? bcadd($value, $half, $scale)
            : bcsub($value, $half, $scale);
    }
}
