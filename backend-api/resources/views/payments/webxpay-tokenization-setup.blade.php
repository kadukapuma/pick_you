<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add payment card</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <script src="{{ $sessionScriptUrl }}"></script>
    <style>
        :root {
            --green: #059669;
            --deep-green: #064E3B;
            --mint: #ECFDF5;
            --ink: #10231D;
            --muted: #64748B;
            --line: #E2E8F0;
            --background: #F5FAF8;
            --danger: #DC2626;
            --white: #FFFFFF;
        }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            min-height: 100vh;
            background: var(--background);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: var(--ink);
            display: flex;
            justify-content: center;
            padding: 28px 16px 48px;
        }

        main {
            width: 100%;
            max-width: 420px;
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
        }

        .header .icon {
            width: 52px;
            height: 52px;
            border-radius: 18px;
            background: var(--mint);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 14px;
        }

        h1 {
            font-size: 20px;
            font-weight: 900;
            margin: 0 0 6px;
        }

        .subtitle {
            font-size: 13px;
            line-height: 19px;
            color: var(--muted);
            margin: 0;
        }

        .panel {
            background: var(--white);
            border: 1px solid var(--line);
            border-radius: 20px;
            padding: 20px 18px;
            box-shadow: 0 3px 14px rgba(15, 23, 42, 0.05);
            margin-top: 20px;
        }

        .section-label {
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 1px;
            color: var(--muted);
            text-transform: uppercase;
            margin: 0 0 12px;
        }

        .panel + .panel {
            margin-top: 14px;
        }

        .field {
            margin-bottom: 14px;
        }

        .field:last-child {
            margin-bottom: 0;
        }

        .row {
            display: flex;
            gap: 10px;
        }

        .row .field {
            flex: 1;
            min-width: 0;
        }

        label {
            display: block;
            font-size: 11px;
            font-weight: 800;
            color: var(--muted);
            margin-bottom: 6px;
        }

        input {
            width: 100%;
            height: 46px;
            padding: 0 14px;
            border-radius: 12px;
            border: 1.5px solid var(--line);
            background: var(--white);
            font-size: 14px;
            color: var(--ink);
            outline: none;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        input:focus {
            border-color: var(--green);
            box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.12);
        }

        input[readonly] {
            background: var(--white);
        }

        button {
            width: 100%;
            height: 52px;
            margin-top: 20px;
            border: none;
            border-radius: 14px;
            background: var(--green);
            color: var(--white);
            font-size: 15px;
            font-weight: 900;
            cursor: pointer;
            transition: opacity 0.15s ease, transform 0.05s ease;
        }

        button:active {
            transform: scale(0.99);
        }

        button:disabled {
            background: #A9C9BE;
            cursor: not-allowed;
        }

        #card-error {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin-top: 14px;
            padding: 12px 14px;
            border-radius: 12px;
            background: #FEF2F2;
            border: 1px solid #FCA5A5;
            color: var(--danger);
            font-size: 12px;
            font-weight: 700;
            line-height: 17px;
        }

        .secure-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            margin-top: 22px;
            color: var(--muted);
            font-size: 11px;
            font-weight: 600;
        }

        .success-state {
            text-align: center;
            padding: 30px 10px;
        }

        .success-state .icon {
            width: 60px;
            height: 60px;
            border-radius: 30px;
            background: var(--mint);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
        }

        .success-state h1 {
            margin-bottom: 6px;
        }

        .success-state p {
            color: var(--muted);
            font-size: 13px;
            line-height: 19px;
            margin: 0;
        }
    </style>
</head>
<body>
    <main>
        <div class="header">
            <div class="icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" stroke="#059669" stroke-width="1.6"/>
                    <path d="M4 10h16" stroke="#059669" stroke-width="1.6"/>
                    <path d="M7 14h4" stroke="#059669" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
            </div>
            <h1>Add payment card</h1>
            <p class="subtitle">Your card details are entered directly into WEBXPAY's secure hosted fields.</p>
        </div>

        <div class="panel">
            <p class="section-label">Card details</p>

            <div class="field">
                <label for="card-number">Card number</label>
                <input id="card-number" type="text" readonly>
            </div>

            <div class="row">
                <div class="field">
                    <label for="expiry-month">Expiry month</label>
                    <input id="expiry-month" type="text" readonly>
                </div>
                <div class="field">
                    <label for="expiry-year">Expiry year</label>
                    <input id="expiry-year" type="text" readonly>
                </div>
                <div class="field">
                    <label for="security-code">CVV</label>
                    <input id="security-code" type="text" readonly>
                </div>
            </div>

            <div class="field">
                <label for="cardholder-name">Cardholder name</label>
                <input id="cardholder-name" type="text" readonly>
            </div>
        </div>

        <div class="panel">
            <p class="section-label">Billing address</p>

            <div class="field">
                <label for="address-line-one">Billing address</label>
                <input id="address-line-one" type="text" autocomplete="street-address" required>
            </div>

            <div class="row">
                <div class="field">
                    <label for="city">City</label>
                    <input id="city" type="text" autocomplete="address-level2" required>
                </div>
                <div class="field">
                    <label for="postal-code">Postal code</label>
                    <input id="postal-code" type="text" autocomplete="postal-code" required>
                </div>
            </div>

            <div class="field">
                <label for="country">Country</label>
                <input id="country" type="text" value="Sri Lanka" autocomplete="country-name" required>
            </div>
        </div>

        <button id="save-card-button" type="button" disabled>
            Save card
        </button>

        <p id="card-error" role="alert" hidden></p>

        <div class="secure-row">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" stroke="#64748B" stroke-width="1.6"/>
            </svg>
            <span>Card details are protected by the payment provider</span>
        </div>
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

                document.querySelector('main').innerHTML = `
                    <div class="success-state">
                        <div class="icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                <path d="M5 13l4 4L19 7" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <h1>Card saved</h1>
                        <p>You can return to PickU.</p>
                    </div>
                `;
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
