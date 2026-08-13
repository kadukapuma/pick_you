<?php

namespace App\Services\Payments;

use App\Enums\PaymentAttemptStatus;

class WebxpayStatusMapper
{
    public function map(
        string $statusCode
    ): PaymentAttemptStatus {
        return match ($statusCode) {
            '0',
            '00' => PaymentAttemptStatus::COMPLETED,

            '15' => PaymentAttemptStatus::DECLINED,

            default => PaymentAttemptStatus::UNKNOWN,
        };
    }
}
