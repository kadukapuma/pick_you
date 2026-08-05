<?php

namespace App\Services\Payments;

use RuntimeException;

class WebxpayResponseParser
{
    public function __construct(
        private readonly string $expectedGatewayId
    ) {
        if (trim($this->expectedGatewayId) === '') {
            throw new RuntimeException(
                'WEBXPAY expected gateway ID is not configured.'
            );
        }
    }

    /**
     * @return array{
     *     merchant_order_id: string,
     *     provider_reference: string,
     *     transaction_time: string,
     *     gateway: string,
     *     status_code: string,
     *     comment: string
     * }
     */
    public function parse(
        string $verifiedPayment
    ): array {
        $segments = array_map(
            'trim',
            explode('|', $verifiedPayment)
        );

        if (count($segments) !== 6) {
            throw new RuntimeException(
                'WEBXPAY payment response format is invalid.'
            );
        }

        $sampleOrderMatches = hash_equals(
            $this->expectedGatewayId,
            $segments[3]
        );

        $guideOrderMatches = hash_equals(
            $this->expectedGatewayId,
            $segments[5]
        );

        if (
            ! $sampleOrderMatches
            && ! $guideOrderMatches
        ) {
            throw new RuntimeException(
                'WEBXPAY payment response gateway is invalid.'
            );
        }

        if (
            $sampleOrderMatches
            && $guideOrderMatches
        ) {
            throw new RuntimeException(
                'WEBXPAY payment response format is ambiguous.'
            );
        }

        if ($sampleOrderMatches) {
            $parsed = [
                'merchant_order_id' => $segments[0],
                'provider_reference' => $segments[1],
                'transaction_time' => $segments[2],
                'gateway' => $segments[3],
                'status_code' => $segments[4],
                'comment' => $segments[5],
            ];
        } else {
            $parsed = [
                'merchant_order_id' => $segments[0],
                'provider_reference' => $segments[1],
                'transaction_time' => $segments[2],
                'gateway' => $segments[5],
                'status_code' => $segments[3],
                'comment' => $segments[4],
            ];
        }

        foreach (
            [
                'merchant_order_id',
                'provider_reference',
                'transaction_time',
                'gateway',
                'status_code',
            ] as $requiredField
        ) {
            if ($parsed[$requiredField] === '') {
                throw new RuntimeException(
                    'WEBXPAY payment response format is invalid.'
                );
            }
        }

        return $parsed;
    }
}
