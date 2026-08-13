<?php

namespace App\Enums;

enum PaymentAttemptStatus: string
{
  case CREATED = 'CREATED';
  case REDIRECT_READY = 'REDIRECT_READY';
  case PROCESSING = 'PROCESSING';
  case PENDING = 'PENDING';
  case COMPLETED = 'COMPLETED';
  case DECLINED = 'DECLINED';
  case FAILED = 'FAILED';
  case UNKNOWN = 'UNKNOWN';
  case CANCELLED = 'CANCELLED';
  case EXPIRED = 'EXPIRED';
}
