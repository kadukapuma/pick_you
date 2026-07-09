<?php

namespace App\Exceptions;

use RuntimeException;

class GoogleMapsException extends RuntimeException
{
    public function __construct(string $message, private readonly int $statusCode = 502)
    {
        parent::__construct($message);
    }

    public function statusCode(): int
    {
        return $this->statusCode;
    }
}
