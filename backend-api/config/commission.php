<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Commission
    |--------------------------------------------------------------------------
    |
    | Fallback used when no `commission_rate` setting exists in the database.
    | Resolution order at runtime is: per-driver override, then per-vehicle-type
    | (fare_configs.commission_rate), then the `commission_rate` setting, then
    | this value.
    |
    */

    'default_rate' => env('COMMISSION_DEFAULT_RATE', '0.06'),

    /*
    | How far negative a driver's balance may go before they are blocked from
    | going online or accepting rides. Seeds driver_accounts.credit_limit on
    | creation; changing it does not rewrite existing rows, so a policy change
    | cannot silently block drivers mid-shift.
    */

    'default_credit_limit' => env('COMMISSION_DEFAULT_CREDIT_LIMIT', '-2000'),

    /*
    | Warn the driver in-app once they cross this fraction of their limit.
    */

    'warn_at_fraction' => 0.75,

];
