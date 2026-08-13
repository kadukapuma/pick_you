<?php

namespace App\Services\Payments;

use RuntimeException;

class WebxpayCheckoutRequest
{
    public function __construct(
        private readonly WebxpayRequestPayload $payload,
        private readonly string $secretKey,
        private readonly string $gatewayId,
        private readonly string $currency,
        private readonly string $encryptionMethod
    ) {
        if (trim($this->secretKey) === '') {
            throw new RuntimeException(
                'WEBXPAY secret key is not configured.'
            );
        }

        if ($this->currency !== 'LKR') {
            throw new RuntimeException(
                'WEBXPAY currency must be LKR.'
            );
        }
        if (trim($this->encryptionMethod) === '') {
            throw new RuntimeException(
                'WEBXPAY encryption method is not configured.'
            );
        }
    }

    /**
     * @param  array<string, string>  $customer
     * @param  list<string>  $customFields
     * @return array<string, string>
     */
    public function build(
        array $customer,
        string $merchantOrderId,
        string $amount,
        array $customFields = []
    ): array {
        $requiredCustomerFields = [
            'first_name',
            'last_name',
            'email',
            'contact_number',
            'address_line_one',
        ];

        foreach ($requiredCustomerFields as $field) {
            if (
                ! array_key_exists($field, $customer)
                || trim((string) $customer[$field]) === ''
            ) {
                throw new RuntimeException(
                    "WEBXPAY customer field {$field} is required."
                );
            }
        }

        if (
            filter_var(
                $customer['email'],
                FILTER_VALIDATE_EMAIL
            ) === false
        ) {
            throw new RuntimeException(
                'WEBXPAY customer email is invalid.'
            );
        }

        if (
            ! preg_match(
                '/^\+?[0-9]{9,20}$/',
                $customer['contact_number']
            )
        ) {
            throw new RuntimeException(
                'WEBXPAY customer contact number is invalid.'
            );
        }

        foreach ($customFields as $customField) {
            if (
                ! is_string($customField)
                || preg_match(
                    '/[|\x00-\x1F\x7F]/',
                    $customField
                ) === 1
            ) {
                throw new RuntimeException(
                    'WEBXPAY custom field is invalid.'
                );
            }
        }

        return [
            'first_name' => $customer['first_name'],
            'last_name' => $customer['last_name'],
            'email' => $customer['email'],
            'contact_number' => $customer['contact_number'],
            'address_line_one' => $customer['address_line_one'],
            'address_line_two' => $customer['address_line_two'] ?? '',
            'city' => $customer['city'] ?? '',
            'state' => $customer['state'] ?? '',
            'postal_code' => $customer['postal_code'] ?? '',
            'country' => $customer['country'] ?? '',
            'process_currency' => $this->currency,
            'payment_gateway_id' => $this->gatewayId,
            'cms' => 'PHP',
            'custom_fields' => base64_encode(
                implode('|', $customFields)
            ),
            'enc_method' => $this->encryptionMethod,
            'secret_key' => $this->secretKey,
            'payment' => $this->payload->encrypt(
                $merchantOrderId,
                $amount
            ),
        ];
    }
}
