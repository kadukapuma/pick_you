<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case PENDING = 'PENDING';
    case PROCESSING = 'PROCESSING';
    case COMPLETED = 'COMPLETED';
    case DECLINED = 'DECLINED';
    case FAILED = 'FAILED';
    case UNKNOWN = 'UNKNOWN';
    case CANCELLED = 'CANCELLED';
    case EXPIRED = 'EXPIRED';
    case PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED';
    case REFUNDED = 'REFUNDED';
}
