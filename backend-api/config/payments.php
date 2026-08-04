<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Payment gateway
    |--------------------------------------------------------------------------
    |
    | Which gateway implementation to bind. "mock" simulates captures without
    | contacting anything and is refused outright in production - see
    | PaymentGatewayServiceProvider and MockPaymentGateway.
    |
    | Supported: "mock", "payhere" (not yet implemented)
    |
    */

    'driver' => env('PAYMENTS_DRIVER', 'mock'),

    /*
    |--------------------------------------------------------------------------
    | Allow the mock gateway in production
    |--------------------------------------------------------------------------
    |
    | DANGEROUS. A mock capture posts a real journal entry crediting the driver
    | their share of money that was never collected. Paying that out moves real
    | cash out of the company account for revenue it never received, and a
    | cleared bank transfer cannot be undone.
    |
    | Only enable this to demo the card flow before a real gateway exists, and
    | only while you are NOT paying drivers out. Every entry it creates is
    | tagged gateway = 'mock', so they can be found and reversed:
    |
    |     select * from journal_entries where gateway = 'mock';
    |
    */

    'allow_mock_in_production' => env('PAYMENTS_ALLOW_MOCK_IN_PRODUCTION', false),

];
