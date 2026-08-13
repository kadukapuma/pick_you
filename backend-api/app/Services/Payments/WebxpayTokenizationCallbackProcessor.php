<?php

namespace App\Services\Payments;

use App\Models\WebxpayTokenizationOperation;
use DomainException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class WebxpayTokenizationCallbackProcessor
{
    public function __construct(
        private readonly WebxpayTokenizationResultParser $parser,
        private readonly WebxpaySavedCardSynchronizer $synchronizer
    ) {}

    public function process(
        WebxpayTokenizationOperation $operation,
        string $callbackToken,
        string $encodedResult
    ): string {
        $operation = WebxpayTokenizationOperation::query()
            ->findOrFail($operation->id);

        $this->verifyCallbackToken($operation, $callbackToken);

        if ($operation->status === WebxpayTokenizationOperation::STATUS_COMPLETED) {
            return WebxpayTokenizationOperation::STATUS_COMPLETED;
        }

        if ($operation->status === WebxpayTokenizationOperation::STATUS_FAILED) {
            return WebxpayTokenizationOperation::STATUS_FAILED;
        }

        if ($operation->status !== WebxpayTokenizationOperation::STATUS_THREE_DS_REQUIRED) {
            throw new DomainException(
                'WEBXPAY tokenization callback is not expected.'
            );
        }

        $result = $this->parser->parse($encodedResult);

        if (
            ! hash_equals($operation->customer_id, $result->customerId)
            || ! hash_equals(
                strtolower($operation->customer_email),
                strtolower($result->customerEmail)
            )
        ) {
            throw new RuntimeException(
                'WEBXPAY tokenization customer does not match the operation.'
            );
        }

        if (! $result->successful) {
            $operation->markFailed(
                'THREE_DS_FAILED',
                'Card authentication was not completed.'
            );

            return WebxpayTokenizationOperation::STATUS_FAILED;
        }

        $operation->loadMissing('passenger');

        retry(
            4,
            function () use ($operation, $result): void {
                $methods = $this->synchronizer->sync(
                    $operation->passenger
                );
                $cardExists = $methods->contains(
                    fn ($method) => hash_equals(
                        (string) $method->getRawOriginal('token'),
                        (string) $result->providerCardId
                    )
                );

                if (! $cardExists) {
                    throw new RuntimeException(
                        'WEBXPAY saved card could not be reconciled.'
                    );
                }
            },
            app()->environment('testing') ? 0 : 500,
            fn (\Throwable $exception) => $exception instanceof RuntimeException
        );

        DB::transaction(function () use ($operation) {
            $locked = WebxpayTokenizationOperation::query()
                ->lockForUpdate()
                ->findOrFail($operation->id);

            if ($locked->status === WebxpayTokenizationOperation::STATUS_THREE_DS_REQUIRED) {
                $locked->markCompleted();
            }
        }, 3);

        return WebxpayTokenizationOperation::STATUS_COMPLETED;
    }

    private function verifyCallbackToken(
        WebxpayTokenizationOperation $operation,
        string $callbackToken
    ): void {
        $expectedHash = (string) $operation->getRawOriginal(
            'callback_token_hash'
        );

        if (
            strlen($callbackToken) !== 64
            || $expectedHash === ''
            || ! hash_equals(
                $expectedHash,
                hash('sha256', $callbackToken)
            )
        ) {
            throw new DomainException(
                'WEBXPAY tokenization callback token is invalid.'
            );
        }
    }
}
