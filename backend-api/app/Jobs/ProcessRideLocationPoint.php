<?php

namespace App\Jobs;

use App\Services\Locations\RideLocationPointProcessor;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessRideLocationPoint implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly array $payload)
    {
        $this->onQueue(config('location.queue', 'locations'));
    }

    public function handle(RideLocationPointProcessor $processor): void
    {
        $processor->process($this->payload);
    }
}
