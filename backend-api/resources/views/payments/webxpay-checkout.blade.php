<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    >
    <meta name="robots" content="noindex, nofollow">
    <title>Redirecting to WEBXPAY</title>
</head>
<body>
    <p>Redirecting you to the secure WEBXPAY checkout…</p>

    <form
        id="webxpay-checkout"
        action="{{ $checkoutUrl }}"
        method="POST"
        autocomplete="off"
    >
        @foreach ($fields as $name => $value)
            <input
                type="hidden"
                name="{{ $name }}"
                value="{{ $value }}"
            >
        @endforeach

        <noscript>
            <button type="submit">
                Continue to WEBXPAY
            </button>
        </noscript>
    </form>

    <script>
        document
            .getElementById('webxpay-checkout')
            .submit();
    </script>
</body>
</html>