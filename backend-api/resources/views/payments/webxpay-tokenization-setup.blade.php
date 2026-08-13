<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add payment card</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <script src="{{ $sessionScriptUrl }}"></script>
</head>
<body>
    <main>
        <h1>Add payment card</h1>
        <p>Your card details are entered directly into WEBXPAY's secure hosted fields.</p>

        <label for="card-number">Card number</label>
        <input id="card-number" type="text" readonly>

        <label for="expiry-month">Expiry month</label>
        <input id="expiry-month" type="text" readonly>

        <label for="expiry-year">Expiry year</label>
        <input id="expiry-year" type="text" readonly>

        <label for="security-code">Security code</label>
        <input id="security-code" type="text" readonly>

        <label for="cardholder-name">Cardholder name</label>
        <input id="cardholder-name" type="text" readonly>

        <label for="address-line-one">Billing address</label>
        <input id="address-line-one" type="text" autocomplete="street-address" required>

        <label for="city">City</label>
        <input id="city" type="text" autocomplete="address-level2" required>

        <label for="postal-code">Postal code</label>
        <input id="postal-code" type="text" autocomplete="postal-code" required>

        <label for="country">Country</label>
        <input id="country" type="text" value="Sri Lanka" autocomplete="country-name" required>

        <button id="save-card-button" type="button" disabled>
            Save card
        </button>

        <p id="card-error" role="alert" hidden></p>
    </main>

    <script>
        const sessionSubmitUrl = @json($sessionSubmitUrl);

        PaymentSession.configure({
            fields: {
                card: {
                    number: '#card-number',
                    securityCode: '#security-code',
                    expiryMonth: '#expiry-month',
                    expiryYear: '#expiry-year',
                    nameOnCard: '#cardholder-name',
                },
            },
            frameEmbeddingMitigation: ['javascript'],
            callbacks: {
                initialized: function () {
                    document.getElementById('save-card-button').disabled = false;
                },
                formSessionUpdate: function (response) {
                    if (response.status === 'ok') {
                        window.dispatchEvent(new CustomEvent(
                            'webxpay-session-created',
                            { detail: { sessionId: response.session.id } }
                        ));
                        return;
                    }

                    const error = document.getElementById('card-error');
                    error.textContent = 'Please check your card details and try again.';
                    error.hidden = false;
                    document.getElementById('save-card-button').disabled = false;
                },
            },
            interaction: {
                displayControl: {
                    formatCard: 'EMBOSSED',
                    invalidFieldCharacters: 'REJECT',
                },
            },
        });

        document.getElementById('save-card-button').addEventListener('click', function () {
            this.disabled = true;
            document.getElementById('card-error').hidden = true;
            PaymentSession.updateSessionFromForm('card');
        });

        window.addEventListener('webxpay-session-created', async function (event) {
            try {
                const response = await fetch(sessionSubmitUrl, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                    },
                    body: JSON.stringify({
                        session: event.detail.sessionId,
                        address_line_one: document.getElementById('address-line-one').value,
                        city: document.getElementById('city').value,
                        postal_code: document.getElementById('postal-code').value,
                        country: document.getElementById('country').value,
                    }),
                });
                const payload = await response.json();

                if (!response.ok || payload.status !== 'success') {
                    throw new Error('Card setup request failed.');
                }

                if (payload.data.requires_3ds) {
                    window.location.assign(payload.data.three_ds_url);
                    return;
                }

                document.querySelector('main').innerHTML = '<h1>Card saved</h1><p>You can return to PickU.</p>';
            } catch (error) {
                const message = document.getElementById('card-error');
                message.textContent = 'Card setup could not be completed. Please try again.';
                message.hidden = false;
                document.getElementById('save-card-button').disabled = false;
            }
        });
    </script>
</body>
</html>
