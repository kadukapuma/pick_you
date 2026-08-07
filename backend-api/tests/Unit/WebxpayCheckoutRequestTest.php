<?php

namespace Tests\Unit;

use App\Services\Payments\WebxpayCheckoutRequest;
use App\Services\Payments\WebxpayRequestPayload;
use PHPUnit\Framework\TestCase;
use RuntimeException;

class WebxpayCheckoutRequestTest extends TestCase
{
    public function test_it_builds_the_official_redirect_request_fields(): void
    {
        $payload = $this->createMock(
            WebxpayRequestPayload::class
        );

        $payload
            ->expects($this->once())
            ->method('encrypt')
            ->with(
                'PKU-R-123-A-1',
                '300.00'
            )
            ->willReturn('encrypted-payment');

        $request = new WebxpayCheckoutRequest(
            payload: $payload,
            secretKey: 'sandbox-secret',
            gatewayId: '46',
            currency: 'LKR',
            encryptionMethod: 'JCs3J+6oSz4V0LgE0zi/Bg=='
        );

        $fields = $request->build(
            customer: [
                'first_name' => 'Test',
                'last_name' => 'Passenger',
                'email' => 'passenger@example.com',
                'contact_number' => '0771234567',
                'address_line_one' => '123 Test Road',
                'address_line_two' => '',
                'city' => 'Colombo',
                'state' => 'Western',
                'postal_code' => '00100',
                'country' => 'Sri Lanka',
            ],
            merchantOrderId: 'PKU-R-123-A-1',
            amount: '300.00',
            customFields: [
                'attempt-789',
                'ride-123',
            ]
        );

        $this->assertSame(
            [
                'first_name' => 'Test',
                'last_name' => 'Passenger',
                'email' => 'passenger@example.com',
                'contact_number' => '0771234567',
                'address_line_one' => '123 Test Road',
                'address_line_two' => '',
                'city' => 'Colombo',
                'state' => 'Western',
                'postal_code' => '00100',
                'country' => 'Sri Lanka',
                'process_currency' => 'LKR',
                'payment_gateway_id' => '46',
                'cms' => 'PHP',
                'custom_fields' => base64_encode(
                    'attempt-789|ride-123'
                ),
                'enc_method' => 'JCs3J+6oSz4V0LgE0zi/Bg==',
                'secret_key' => 'sandbox-secret',
                'payment' => 'encrypted-payment',
            ],
            $fields
        );
    }

    public function test_it_rejects_a_missing_required_customer_field(): void
    {
        $payload = $this->createMock(
            WebxpayRequestPayload::class
        );

        $payload
            ->expects($this->never())

            ->method('encrypt');

        $request = new WebxpayCheckoutRequest(
            payload: $payload,
            secretKey: 'sandbox-secret',
            gatewayId: '46',
            currency: 'LKR',
            encryptionMethod: 'JCs3J+6oSz4V0LgE0zi/Bg=='
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY customer field email is required.'
        );

        $request->build(
            customer: [
                'first_name' => 'Test',
                'last_name' => 'Passenger',
                'contact_number' => '0771234567',
                'address_line_one' => '123 Test Road',
            ],
            merchantOrderId: 'PKU-R-123-A-1',
            amount: '300.00'
        );
    }

    public function test_it_rejects_an_invalid_customer_email(): void
    {
        $payload = $this->createMock(
            WebxpayRequestPayload::class
        );

        $payload
            ->expects($this->never())
            ->method('encrypt');

        $request = new WebxpayCheckoutRequest(
            payload: $payload,
            secretKey: 'sandbox-secret',
            gatewayId: '46',
            currency: 'LKR',
            encryptionMethod: 'JCs3J+6oSz4V0LgE0zi/Bg=='
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY customer email is invalid.'
        );

        $request->build(
            customer: [
                'first_name' => 'Test',
                'last_name' => 'Passenger',
                'email' => 'not-an-email',
                'contact_number' => '0771234567',
                'address_line_one' => '123 Test Road',
            ],
            merchantOrderId: 'PKU-R-123-A-1',
            amount: '300.00'
        );
    }

    public function test_it_rejects_an_invalid_contact_number(): void
    {
        $payload = $this->createMock(
            WebxpayRequestPayload::class
        );

        $payload
            ->expects($this->never())
            ->method('encrypt');

        $request = new WebxpayCheckoutRequest(
            payload: $payload,
            secretKey: 'sandbox-secret',
            gatewayId: '46',
            currency: 'LKR',
            encryptionMethod: 'JCs3J+6oSz4V0LgE0zi/Bg=='
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY customer contact number is invalid.'
        );

        $request->build(
            customer: [
                'first_name' => 'Test',
                'last_name' => 'Passenger',
                'email' => 'passenger@example.com',
                'contact_number' => '077-123-4567',
                'address_line_one' => '123 Test Road',
            ],
            merchantOrderId: 'PKU-R-123-A-1',
            amount: '300.00'
        );
    }

    public function test_it_rejects_an_empty_secret_key(): void
    {
        $payload = $this->createMock(
            WebxpayRequestPayload::class
        );

        $payload
            ->expects($this->never())
            ->method('encrypt');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY secret key is not configured.'
        );

        $request = new WebxpayCheckoutRequest(
            payload: $payload,
            secretKey: '',
            gatewayId: '46',
            currency: 'LKR',
            encryptionMethod: 'JCs3J+6oSz4V0LgE0zi/Bg=='
        );

        $request->build(
            customer: [
                'first_name' => 'Test',
                'last_name' => 'Passenger',
                'email' => 'passenger@example.com',
                'contact_number' => '0771234567',
                'address_line_one' => '123 Test Road',
            ],
            merchantOrderId: 'PKU-R-123-A-1',
            amount: '300.00'
        );
    }

    public function test_it_sends_an_empty_gateway_id_like_the_official_sample(): void
    {
        $payload = $this->createMock(
            WebxpayRequestPayload::class
        );

        $payload
            ->expects($this->once())
            ->method('encrypt')
            ->with(
                'PKU-R-123-A-1',
                '300.00'
            )
            ->willReturn('encrypted-payment');

        $request = new WebxpayCheckoutRequest(
            payload: $payload,
            secretKey: 'sandbox-secret',
            gatewayId: '',
            currency: 'LKR',
            encryptionMethod: 'JCs3J+6oSz4V0LgE0zi/Bg=='
        );

        $fields = $request->build(
            customer: [
                'first_name' => 'Test',
                'last_name' => 'Passenger',
                'email' => 'passenger@example.com',
                'contact_number' => '94761838473',
                'address_line_one' => '123 Test Road',
            ],
            merchantOrderId: 'PKU-R-123-A-1',
            amount: '300.00'
        );

        $this->assertArrayHasKey(
            'payment_gateway_id',
            $fields
        );

        $this->assertSame(
            '',
            $fields['payment_gateway_id']
        );
    }

    public function test_it_rejects_a_non_lkr_currency(): void
    {
        $payload = $this->createMock(
            WebxpayRequestPayload::class
        );

        $payload
            ->expects($this->never())
            ->method('encrypt');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY currency must be LKR.'
        );

        new WebxpayCheckoutRequest(
            payload: $payload,
            secretKey: 'sandbox-secret',
            gatewayId: '46',
            currency: 'USD',
            encryptionMethod: 'JCs3J+6oSz4V0LgE0zi/Bg=='
        );
    }

    public function test_it_rejects_an_empty_encryption_method(): void
    {
        $payload = $this->createMock(
            WebxpayRequestPayload::class
        );

        $payload
            ->expects($this->never())
            ->method('encrypt');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY encryption method is not configured.'
        );

        new WebxpayCheckoutRequest(
            payload: $payload,
            secretKey: 'sandbox-secret',
            gatewayId: '46',
            currency: 'LKR',
            encryptionMethod: ''
        );
    }

    public function test_it_rejects_a_custom_field_containing_the_separator(): void
    {
        $payload = $this->createMock(
            WebxpayRequestPayload::class
        );

        $payload
            ->expects($this->never())
            ->method('encrypt');

        $request = new WebxpayCheckoutRequest(
            payload: $payload,
            secretKey: 'sandbox-secret',
            gatewayId: '46',
            currency: 'LKR',
            encryptionMethod: 'JCs3J+6oSz4V0LgE0zi/Bg=='
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY custom field is invalid.'
        );

        $request->build(
            customer: [
                'first_name' => 'Test',
                'last_name' => 'Passenger',
                'email' => 'passenger@example.com',
                'contact_number' => '0771234567',
                'address_line_one' => '123 Test Road',
            ],
            merchantOrderId: 'PKU-R-123-A-1',
            amount: '300.00',
            customFields: [
                'attempt-789|injected-field',
                'ride-123',
            ]
        );
    }
}
