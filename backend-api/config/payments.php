<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Payment gateway
    |--------------------------------------------------------------------------
    |
    | Which gateway implementation to bind.
    |
    | Supported: "mock", "webxpay"
    |
    */

    'driver' => env('PAYMENTS_DRIVER', 'mock'),

    /*
    |--------------------------------------------------------------------------
    | Allow the mock gateway in production
    |--------------------------------------------------------------------------
    |
    | DANGEROUS. A mock capture posts a real journal entry crediting the driver
    | their share of money that was never collected.
    |
    | Only enable this for controlled demonstrations where real driver payouts
    | are disabled.
    |
    */

    'allow_mock_in_production' => env(
        'PAYMENTS_ALLOW_MOCK_IN_PRODUCTION',
        false
    ),

    /*
    |--------------------------------------------------------------------------
    | PickU credit payments
    |--------------------------------------------------------------------------
    |
    | Controls whether PassengerApp may apply available PickU credit to a ride.
    | Balance and transaction history remain readable when this is disabled.
    |
    */

    'picku_credit' => [
        'enabled' => env(
            'PICKU_CREDIT_PAYMENTS_ENABLED',
            false
        ),
    ],

    /*
    |--------------------------------------------------------------------------
    | WEBXPAY Configuration
    |--------------------------------------------------------------------------
    */

    'webxpay' => [
        'enabled' => env('WEBXPAY_ENABLED', false),

        'environment' => env(
            'WEBXPAY_ENVIRONMENT',
            'staging'
        ),

        'checkout_url' => env('WEBXPAY_CHECKOUT_URL'),

        'payment_gateway_id' => env(
            'WEBXPAY_PAYMENT_GATEWAY_ID',
            ''
        ),

        'response_gateway_id' => env(
            'WEBXPAY_RESPONSE_GATEWAY_ID',
            '40'
        ),

        'currency' => env(
            'WEBXPAY_CURRENCY',
            'LKR'
        ),
        'encryption_method' => env(
            'WEBXPAY_ENCRYPTION_METHOD',
            'JCs3J+6oSz4V0LgE0zi/Bg=='
        ),

        'public_key_path' => env(
            'WEBXPAY_PUBLIC_KEY_PATH'
        ),

        'secret_key' => env(
            'WEBXPAY_SECRET_KEY'
        ),

        'api_username' => env(
            'WEBXPAY_API_USERNAME'
        ),

        'api_password' => env(
            'WEBXPAY_API_PASSWORD'
        ),

        'return_url' => env(
            'WEBXPAY_RETURN_URL'
        ),

        'app_result_url' => env(
            'WEBXPAY_APP_RESULT_URL',
            'picku://payments/result'
        ),

        'tokenization' => [
            'enabled' => env(
                'WEBXPAY_TOKENIZATION_ENABLED',
                false
            ),
            'base_url' => env(
                'WEBXPAY_TOKENIZATION_URL',
                'https://tokenize.stagingxpay.info'
            ),
            'username' => env(
                'WEBXPAY_TOKENIZATION_USERNAME'
            ),
            'password' => env(
                'WEBXPAY_TOKENIZATION_PASSWORD'
            ),
            'bank_mid' => env(
                'WEBXPAY_TOKENIZATION_BANK_MID',
                'TESTWEBXPATOKLKR'
            ),
            'hosted_session_version' => env(
                'WEBXPAY_TOKENIZATION_SESSION_VERSION',
                '63'
            ),
            'hosted_session_script_base_url' => env(
                'WEBXPAY_TOKENIZATION_SESSION_SCRIPT_BASE_URL',
                'https://cbcmpgs.gateway.mastercard.com/form'
            ),
            'operation_ttl_minutes' => env(
                'WEBXPAY_TOKENIZATION_OPERATION_TTL_MINUTES',
                15
            ),
            'result_url' => env(
                'WEBXPAY_TOKENIZATION_RESULT_URL'
            ),
            'app_result_url' => env(
                'WEBXPAY_TOKENIZATION_APP_RESULT_URL',
                'picku://payments/card-result'
            ),
            'token_cache_seconds' => env(
                'WEBXPAY_TOKENIZATION_TOKEN_CACHE_SECONDS',
                3300
            ),
        ],
    ],

];
